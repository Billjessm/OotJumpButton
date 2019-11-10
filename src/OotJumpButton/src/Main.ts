import { EventsClient, EventHandler } from 'modloader64_api/EventHandler';
import { IModLoaderAPI, IPlugin } from 'modloader64_api/IModLoaderAPI';
import { InjectCore } from 'modloader64_api/CoreInjection';
import * as API from 'modloader64_api/OOT/OOTAPI';

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

    // Adjust height second frame of jump
    if (this.needAdjust) {
      this.core.link.rdramWriteF32(0x60, 5);
      this.needAdjust = false;
    }

    // Escape if not pressing jump button
    if ((curBtn & 0x8000) === 0) {
      this.isPressed = false;
      return;
    } else if (this.isPressed) return;

    // Make sure we are in a valid state to jump
    let state = this.core.link.state;
    if (state !== API.LinkState.STANDING) return;

    // Get original position
    let py = this.core.link.rdramReadF32(0x28);

    // Add some instant up positioning
    this.core.link.rdramWriteF32(0x28, py + 10);

    // Add upward velocity
    this.core.link.rdramWriteF32(0x60, 8);

    // Set jump state
    this.core.link.rdramWrite32(0x066c, 0x00040000);
    this.isPressed = true;
    this.needAdjust = true;
  }

  @EventHandler(EventsClient.ON_INJECT_FINISHED)
  onClient_InjectFinished(evt: any) { }
}
