import MemoryAligned16 from "./MemoryAligned16.ts";
import { IMemoryView, IVRAM } from "../interfaces.ts";

export default class GameBoyAdvanceVRAM extends MemoryAligned16 implements IVRAM {
    vram: Uint16Array
    constructor(size: number) {
        super(size);
        this.vram = this.buffer;
    }

    getMemoryView(): IMemoryView {
        return this as IMemoryView;
    }
}

