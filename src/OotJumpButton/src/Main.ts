import { EventsClient, EventHandler } from 'modloader64_api/EventHandler';
import { IModLoaderAPI, IPlugin } from 'modloader64_api/IModLoaderAPI';
import { InjectCore } from 'modloader64_api/CoreInjection';
import * as API from 'modloader64_api/OOT/OOTAPI';

const enum AButtonState {
  BLANK = 0x0A,
  ATTACK = 0x00,
  SPEAK = 0x0F,
  CHECK = 0x01,
}

const enum LinkState2 {
  // Sword attack while moving forward
  // Includes moving while releasing sword beam
  // and forward with B
  MOVE_SWORD = 0x40000000,
  // Shopping
  SHOPPING = 0x20000000,
  // Playing Ocarina
  OCARINA = 0x08000000,
  // Navi is hovering a target
  NAVI_HOVER = 0x00100000,
  // Navi wants to talk
  NAVI_C_UP = 0x00200000,
  // Z-Targeting a target
  Z_TARGET = 0x00002000,
  // Z-Targeting a target
  Z_JUMP = 0x00080000,
  // Can talk to sign or npc
  CAN_READ = 0x00000002,
  // In crawlspace
  CRAWLING = 0x00040000,
  // Attached to enemy
  CONNECT_TO_ENEMY = 0x00000080,
  // Is oriented horizontal - eg:
  // in crawlspace or being knocked back
  HORIZONTAL = 0x00000040,
  // In front of crawlspace
  CAN_CRAWL = 0x00010000,
  // Idle Standing
  IDLE1 = 0x00000000,
  // Idle Animation
  IDLE2 = 0x10000000,
}

export class OotJumpButton implements IPlugin {
  ModLoader = {} as IModLoaderAPI;
  name = 'OotJumpButton';

  @InjectCore() core!: API.IOOTCore;

  private gc: number = 0x00;
  private isPressed: boolean = false;
  private needAdjust: boolean = false;

  constructor() { }

  preinit(): void { }

  init(): void { }

  postinit(): void {
    this.gc = global.ModLoader['global_context_pointer'];
  }

  onTick(): void {
    // Read 'Button' Code
    let curBtn = this.ModLoader.emulator.rdramReadPtr16(this.gc, 0x14);

    if (this.needAdjust) {
      // Adjust height second frame of jump
      this.core.link.rdramWriteF32(0x60, 5);

      // Set jump state
      this.core.link.rdramWrite32(0x066c, 0x00040000);

      this.needAdjust = false;
    }

    // Escape if not pressing jump button
    if ((curBtn & 0x8000) === 0) {
      this.isPressed = false;
      return;
    }

    let aState = this.ModLoader.emulator.rdramRead8(0x1d8b7f);
    if (!
      (aState === AButtonState.BLANK ||
        aState === AButtonState.ATTACK)
    ) return;

    if (this.isPressed) return;

    // Make sure we are in a valid state to jump
    let state1 = this.core.link.state;
    let state2 = this.core.link.rdramRead32(0x0670);
    let animID = this.core.link.get_anim_id();
    if (!(
      (
        state1 === API.LinkState.STANDING ||
        state1 === API.LinkState.HOLDING_ACTOR
      ) &&
      (!(
        (state2 & LinkState2.IDLE1) !== 0 ||
        (state2 & LinkState2.IDLE2) !== 0 ||
        (state2 & LinkState2.CRAWLING) !== 0 ||
        (state2 & LinkState2.CONNECT_TO_ENEMY) !== 0 ||
        (state2 & LinkState2.HORIZONTAL) !== 0
      )) &&
      (!(
        animID === 0x3240 ||
        animID === 0x3170 ||
        animID === 0x3020 ||
        animID === 0x3040
      ))
    )) return;

    // Get original position
    let py = this.core.link.rdramReadF32(0x28);

    // Add some instant up positioning
    this.core.link.rdramWriteF32(0x28, py + 10);

    // Add upward velocity
    this.core.link.rdramWriteF32(0x60, 8);

    this.isPressed = true;
    this.needAdjust = true;
  }

  @EventHandler(EventsClient.ON_INJECT_FINISHED)
  onClient_InjectFinished(evt: any) { }
}
