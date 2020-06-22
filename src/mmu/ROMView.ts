import MemoryView from "./MemoryView.ts";
import {IGPIO, IMMU, IROMView} from "../interfaces.ts";

export default class ROMView extends MemoryView implements IROMView {
    ICACHE_PAGE_BITS: number
    PAGE_MASK: number
    gpio?: IGPIO
    #mmu?:IMMU

    constructor(rom: ArrayBuffer, offset: number=0){
        super(rom, offset);
        this.ICACHE_PAGE_BITS = 10;
        this.PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;
        // this.icache = new Array(rom.byteLength >> (this.ICACHE_PAGE_BITS + 1));
        this.mask = 0x01FFFFFF;
        this.resetMask();
    }

    setMMU(mmu: IMMU):void{
        this.#mmu = mmu;
    }

    store8(offset:number, value:number):void {}

    store16(offset:number, value:number):void {
        if (offset < 0xCA && offset >= 0xC4) {
            if (!this.gpio) {
                this.gpio = this.#mmu?.allocGPIO(this);
            }
            this.gpio?.store16(offset, value);
        }
    }
    
    store32(offset:number, value:number):void {
        if (offset < 0xCA && offset >= 0xC4) {
            if (!this.gpio) {
                this.gpio = this.#mmu?.allocGPIO(this);
            }
            this.gpio?.store32(offset, value);
        }
    }    
}