import MemoryView from "./MemoryView.ts";
import {ICacheData} from "../interfaces.ts";

export default class MemoryBlock extends MemoryView {
    ICACHE_PAGE_BITS:number
    PAGE_MASK:number
    constructor(size:number, cacheBits:number){
        super(new ArrayBuffer(size));
        this.ICACHE_PAGE_BITS = cacheBits;
        this.PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;
        this.icache = new Array(size >> (this.ICACHE_PAGE_BITS + 1));    
    }

    invalidatePage(address:number):void {
        if(!this.icache){
            throw new Error("no init icache");
        }

        const page = this.icache[(address & this.mask) >> this.ICACHE_PAGE_BITS] as ICacheData;
        if (page) {
            page.invalid = true;
        }
    }
}



