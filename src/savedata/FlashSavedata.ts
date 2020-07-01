import {ISave, IDMA} from "../interfaces.ts";
import MemoryView from "../mmu/MemoryView.ts";

export default class FlashSavedata extends MemoryView implements ISave {
    writePending:boolean = false
    static COMMAND_WIPE: number = 0x10
    static COMMAND_ERASE_SECTOR: number = 0x30
    static COMMAND_ERASE: number = 0x80
    static COMMAND_ID: number = 0x90
    static COMMAND_WRITE: number = 0xA0
    static COMMAND_SWITCH_BANK: number = 0xB0
    static COMMAND_TERMINATE_ID: number = 0xF0

    static ID_PANASONIC: number = 0x1B32
    static ID_SANYO: number = 0x1362

    idMode: boolean = false    

    first: number = 0
    second: number = 0
    command:number = 0
    pendingCommand:number = 0
    bank: DataView
    bank0: DataView
    bank1: DataView | null
    id: number
    dma: IDMA | null = null

    constructor(size: number){
        super(new ArrayBuffer(size), 0);

        this.bank0 = new DataView(this.buffer, 0, 0x00010000);
        if (size > 0x00010000) {
            this.id = FlashSavedata.ID_SANYO;
            this.bank1 = new DataView(this.buffer, 0x00010000);
        } else {
            this.id = FlashSavedata.ID_PANASONIC;
            this.bank1 = null;
        }
        this.bank = this.bank0;
    }

    load8(offset:number):number {
        if (this.idMode && offset < 2) {
            return (this.id >> (offset << 3)) & 0xFF;
        } else if (offset < 0x10000) {
            return this.bank.getInt8(offset);
        } else {
            return 0;
        }
    }
    
    load16(offset:number):number {
        return (this.load8(offset) & 0xFF) | (this.load8(offset + 1) << 8);
    }
    
    load32(offset:number):number {
        return (this.load8(offset) & 0xFF) | (this.load8(offset + 1) << 8) | (this.load8(offset + 2) << 16) | (this.load8(offset + 3) << 24);
    }
    
    loadU8(offset:number):number {
        return this.load8(offset) & 0xFF;
    }
    
    loadU16(offset:number):number {
        return (this.loadU8(offset) & 0xFF) | (this.loadU8(offset + 1) << 8);
    }
    
    store8(offset:number, value:number):void {
        switch (this.command) {
        case 0:
            if (offset == 0x5555) {
                if (this.second == 0x55) {
                    switch (value) {
                    case FlashSavedata.COMMAND_ERASE:
                        this.pendingCommand = value;
                        break;
                    case FlashSavedata.COMMAND_ID:
                        this.idMode = true;
                        break;
                    case FlashSavedata.COMMAND_TERMINATE_ID:
                        this.idMode = false;
                        break;
                    default:
                        this.command = value;
                        break;
                    }
                    this.second = 0;
                    this.first = 0;
                } else {
                    this.command = 0;
                    this.first = value;
                    this.idMode = false;
                }
            } else if (offset == 0x2AAA && this.first == 0xAA) {
                this.first = 0;
                if (this.pendingCommand) {
                    this.command = this.pendingCommand;
                } else {
                    this.second = value;
                }
            }
            break;
        case FlashSavedata.COMMAND_ERASE:
            switch (value) {
            case FlashSavedata.COMMAND_WIPE:
                if (offset == 0x5555) {
                    for (var i = 0; i < this.view.byteLength; i += 4) {
                        this.view.setInt32(i, -1);
                    }
                }
                break;
            case FlashSavedata.COMMAND_ERASE_SECTOR:
                if ((offset & 0x0FFF) == 0) {
                    for (var i = offset; i < offset + 0x1000; i += 4) {
                        this.bank.setInt32(i, -1);
                    }
                }
                break;
            }
            this.pendingCommand = 0;
            this.command = 0;
            break;
        case FlashSavedata.COMMAND_WRITE:
            this.bank.setInt8(offset, value);
            this.command = 0;
    
            this.writePending = true;
            break;
        case FlashSavedata.COMMAND_SWITCH_BANK:
            if (this.bank1 && offset == 0) {
                if (value == 1) {
                    this.bank = this.bank1;
                } else {
                    this.bank = this.bank0;
                }
            }
            this.command = 0;
            break;
        }
    }
    
    store16(offset:number, value:number):void {
        throw new Error("Unaligned save to flash!");
    }
    
    store32(offset:number, value:number):void {
        throw new Error("Unaligned save to flash!");
    }
    
    replaceData(memory: ArrayBuffer): void {
        const bank = this.view === this.bank1;
        super.replaceData(memory, 0);
    
        this.bank0 = new DataView(this.buffer, 0, 0x00010000);
        if (memory.byteLength > 0x00010000) {
            this.bank1 = new DataView(this.buffer, 0x00010000);
        } else {
            this.bank1 = null;
        }

        if(bank && !this.bank1){
            throw new Error("no init bank");
        }

        this.bank = bank ? this.bank1! : this.bank0;
    }    
}