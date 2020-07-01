import {ISave, IDMA} from "../interfaces.ts";
import MemoryView from "../mmu/MemoryView.ts";

export default class SRAMSavedata extends MemoryView implements ISave {
    writePending:boolean = false
    dma: IDMA | null = null

    constructor(size: number){
        super(new ArrayBuffer(size))
    }    

    store8(offset: number, value: number):void {
        this.view.setInt8(offset, value);
        this.writePending = true;
    }
    
    store16(offset: number, value: number):void {
        this.view.setInt16(offset, value, true);
        this.writePending = true;
    }
    
    store32(offset: number, value: number):void {
        this.view.setInt32(offset, value, true);
        this.writePending = true;
    }    
}