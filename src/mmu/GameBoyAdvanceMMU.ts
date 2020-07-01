
import BIOSView from "./BIOSView.ts";
import MemoryBlock from "./MemoryBlock.ts";
import BadMemory from "./BadMemory.ts";
import ROMView from "./ROMView.ts";
import { GameBoyAdvanceGPIO } from "../gpio/mod.ts";
import { MemoryRegion, MemoryRegionSize, IGPIO, ISave, IGBA, ICart, IIO, IAudio, IMemoryView, IBIOS, ICacheData, IGBAMMU, ICPU, IClose, IROMView, ICloseData, IClear, IContext, IIRQ, ILog, IDMA, DMANumber, NumberHashtable } from "../interfaces.ts";
import {
    factory
} from "../savedata/mod.ts";
import { Serializer } from "../utils.ts";

export default class GameBoyAdvanceMMU implements IGBAMMU, IClose, IClear {

    readonly REGION_BIOS = 0x0;
    readonly REGION_WORKING_RAM = 0x2;
    readonly REGION_WORKING_IRAM = 0x3;
    readonly REGION_IO = 0x4;
    readonly REGION_PALETTE_RAM = 0x5;
    readonly REGION_VRAM = 0x6;
    readonly REGION_OAM = 0x7;
    readonly REGION_CART0 = 0x8;
    readonly REGION_CART1 = 0xA;
    readonly REGION_CART2 = 0xC;
    readonly REGION_CART_SRAM = 0xE;

    readonly BASE_BIOS = 0x00000000;
    readonly BASE_WORKING_RAM = 0x02000000;
    readonly BASE_WORKING_IRAM = 0x03000000;
    readonly BASE_IO = 0x04000000;
    readonly BASE_PALETTE_RAM = 0x05000000;
    readonly BASE_VRAM = 0x06000000;
    readonly BASE_OAM = 0x07000000;
    readonly BASE_CART0 = 0x08000000;
    readonly BASE_CART1 = 0x0A000000;
    readonly BASE_CART2 = 0x0C000000;
    readonly BASE_CART_SRAM = 0x0E000000;

    readonly BASE_MASK = 0x0F000000;
    readonly BASE_OFFSET = 24;
    readonly OFFSET_MASK = 0x00FFFFFF;

    readonly SIZE_BIOS = 0x00004000;
    readonly SIZE_WORKING_RAM = 0x00040000;
    readonly SIZE_WORKING_IRAM = 0x00008000;
    readonly SIZE_IO = 0x00000400;
    readonly SIZE_PALETTE_RAM = 0x00000400;
    readonly SIZE_VRAM = 0x00018000;
    readonly SIZE_OAM = 0x00000400;
    readonly SIZE_CART0 = 0x02000000;
    readonly SIZE_CART1 = 0x02000000;
    readonly SIZE_CART2 = 0x02000000;
    readonly SIZE_CART_SRAM = 0x00008000;
    readonly SIZE_CART_FLASH512 = 0x00010000;
    readonly SIZE_CART_FLASH1M = 0x00020000;
    readonly SIZE_CART_EEPROM = 0x00002000;

    readonly DMA_TIMING_NOW = 0;
    readonly DMA_TIMING_VBLANK = 1;
    readonly DMA_TIMING_HBLANK = 2;
    readonly DMA_TIMING_CUSTOM = 3;

    readonly DMA_INCREMENT = 0;
    readonly DMA_DECREMENT = 1;
    readonly DMA_FIXED = 2;
    readonly DMA_INCREMENT_RELOAD = 3;

    readonly DMA_OFFSET = [1, -1, 0, 1];

    readonly ROM_WS = [4, 3, 2, 8];
    readonly ROM_WS_SEQ = [
        [2, 1],
        [4, 1],
        [8, 1]
    ];

    readonly ICACHE_PAGE_BITS = 8;

    WAITSTATES = [0, 0, 2, 0, 0, 0, 0, 0, 4, 4, 4, 4, 4, 4, 4];
    WAITSTATES_32 = [0, 0, 5, 0, 0, 1, 0, 1, 7, 7, 9, 9, 13, 13, 8];
    WAITSTATES_SEQ = [0, 0, 2, 0, 0, 0, 0, 0, 2, 2, 4, 4, 8, 8, 4];
    WAITSTATES_SEQ_32 = [0, 0, 5, 0, 0, 1, 0, 1, 5, 5, 9, 9, 17, 17, 8];
    NULLWAIT = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    PAGE_MASK: number

    waitstates: number[] = []
    waitstatesSeq: number[] = []
    waitstates32: number[] = []
    waitstatesSeq32: number[] = []
    waitstatesPrefetch: number[] = []
    waitstatesPrefetch32: number[] = []

    badMemory: IMemoryView | null = null
    
    private bios: IBIOS | IMemoryView | null = null
    DMA_REGISTER?: NumberHashtable<number>
    
    // cpu: ICPU
    
    core: IContext
    save: ISave | IMemoryView | null = null
    memory: Array<IMemoryView | IBIOS | IIO | null> = []
    cart: ICart | null = null

    constructor(ctx: IContext) {
        for (let i = 15; i < 256; ++i) {
            this.WAITSTATES[i] = 0;
            this.WAITSTATES_32[i] = 0;
            this.WAITSTATES_SEQ[i] = 0;
            this.WAITSTATES_SEQ_32[i] = 0;
            this.NULLWAIT[i] = 0;
        }
        this.PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;
        this.core = ctx;
    }

    getBIOS():IBIOS {
        return this.bios as IBIOS;
    }

    /**
     * 
     * @param region 
     * @param object 
     */
    mmap(region: number, object: IMemoryView): void {
        this.memory[region] = object;
    }

    private getILog(): ILog {
        return this.core.getLog();
    }

    getCPU():ICPU {
        return this.core.getCPU() as ICPU;
    }

    /**
     * 清除記憶體
     */
    clear(): void {
        this.badMemory = new BadMemory(this, this.getCPU());

        // 0~255
        // 0x00000000 BIOS
        // 0x01000000
        // 0x02000000 On-Board RAM
        // 0x03000000 In-Chip RAM
        // 0x04000000 I/O
        // 0x05000000 Palette
        // 0x06000000 VRAM
        // 0x07000000 ORAM
        // 0x08000000 Gamepak WS0
        // 0x0A000000 Gamepak WS1
        // 0x0C000000 Gamepak WS2
        // 0x0E000000 Gamepak SRAM
        this.memory = [
            (this.bios as IMemoryView),
            this.badMemory, // Unused
            new MemoryBlock(MemoryRegionSize.WORKING_RAM, 9),
            new MemoryBlock(MemoryRegionSize.WORKING_IRAM, 7),
            null, // This is owned by GameBoyAdvanceIO
            null, // This is owned by GameBoyAdvancePalette
            null, // This is owned by GameBoyAdvanceVRAM
            null, // This is owned by GameBoyAdvanceOAM
            this.badMemory,
            this.badMemory,
            this.badMemory,
            this.badMemory,
            this.badMemory,
            this.badMemory,
            this.badMemory,
            this.badMemory // Unused
        ];
        for (let i = 16; i < 256; ++i) {
            this.memory[i] = this.badMemory;
        }

        this.waitstates = this.WAITSTATES.slice(0);
        this.waitstatesSeq = this.WAITSTATES_SEQ.slice(0);
        this.waitstates32 = this.WAITSTATES_32.slice(0);
        this.waitstatesSeq32 = this.WAITSTATES_SEQ_32.slice(0);
        this.waitstatesPrefetch = this.WAITSTATES_SEQ.slice(0);
        this.waitstatesPrefetch32 = this.WAITSTATES_SEQ_32.slice(0);

        this.cart = null;
        this.save = null;

        const io = (this.core as IContext).getIO() as IIO;
        this.DMA_REGISTER = [
            io.DMA0CNT_HI >> 1,
            io.DMA1CNT_HI >> 1,
            io.DMA2CNT_HI >> 1,
            io.DMA3CNT_HI >> 1
        ];
    }

    freeze(): ICloseData {
        return {
            'ram': Serializer.prefix(this.getWorkingRam().buffer),
            'iram': Serializer.prefix(this.getWorkingIRam().buffer),
        };
    }

    private getWorkingRam(): IMemoryView {
        return this.memory[MemoryRegion.WORKING_RAM] as IMemoryView;
    }

    private getWorkingIRam(): IMemoryView {
        return this.memory[MemoryRegion.WORKING_IRAM] as IMemoryView;
    }

    defrost(frost: ICloseData): void {
        this.getWorkingRam().replaceData(frost.ram, 0);
        this.getWorkingIRam().replaceData(frost.iram, 0);
    }

    /**
     * 載入 BIOS
     * @param bios 
     * @param real 
     */
    loadBios(bios: ArrayBuffer, real: boolean = false): void {
        this.bios = new BIOSView(bios) as IBIOS;
        this.bios.real = real;
    }

    /**
     * 載入遊戲
     * @param rom 遊戲 ROM
     * @param process 
     */
    loadRom(rom: ArrayBuffer, process: boolean): ICart | null {
        const lo = new ROMView(rom);
        if (lo.view.getUint8(0xB2) != 0x96) {
            // Not a valid ROM
            return null;
        }
        lo.setMMU(this); // Needed for GPIO        
        this.memory[MemoryRegion.CART0] = lo;
        this.memory[MemoryRegion.CART1] = lo;
        this.memory[MemoryRegion.CART2] = lo;

        if (rom.byteLength > 0x01000000) {
            const hi = new ROMView(rom, 0x01000000);
            this.memory[MemoryRegion.CART0 + 1] = hi;
            this.memory[MemoryRegion.CART1 + 1] = hi;
            this.memory[MemoryRegion.CART2 + 1] = hi;
        }

        let cart: ICart = {
            title: null,
            code: null,
            maker: null,
            memory: rom,
            saveType: null,
        };

        if (process) {
            cart.title = this.findTitle(rom);
            cart.code = this.findCode(rom);
            cart.maker = this.findMaker(rom);

            // Find savedata type
            const saveType: string | null = this.findSaveType(rom);
            // if(saveType){                
            // try{
            const result = factory(saveType || '');
            this.save = result.savedata as ISave;
            this.memory[result.region] = result.savedata as IMemoryView;
            this.save.dma = this.getIRQ().dma[3];
            cart.saveType = result.saveType;
            // }catch(err){
            // nothing
            // }
            // }
            // if (!this.save) {
            // Assume we have SRAM
            // this.save = this.memory[MemoryRegion.CART_SRAM] = new SRAMSavedata(this.SIZE_CART_SRAM);
            // }
        }

        this.cart = cart;
        return cart;
    }

    private findTitle(rom: ArrayBuffer): string {
        const content = new Uint8Array(rom);
        return String.fromCharCode(...content.slice(0xa0, 0xa0 + 12));
    }

    private findCode(rom: ArrayBuffer): string {
        const content = new Uint8Array(rom);
        return String.fromCharCode(...content.slice(0xac, 0xac + 4));
    }

    private findMaker(rom: ArrayBuffer): string {
        const content = new Uint8Array(rom);
        return String.fromCharCode(...content.slice(0xb0, 0xb0 + 2));
    }

    /**
     * 存檔格式類型
     * @param rom 
     */
    private findSaveType(rom: ArrayBuffer): string | null {
        let state = '';
        let next;
        const pattern1: readonly string[] = ['F',
            'FL',
            'FLA',
            'FLAS',
            'FLASH',
            'FLASH_',
            'FLASH5',
            'FLASH51',
            'FLASH512',
            'FLASH512_',
            'FLASH1',
            'FLASH1M',
            'FLASH1M_',
            'S',
            'SR',
            'SRA',
            'SRAM',
            'SRAM_',
            'E',
            'EE',
            'EEP',
            'EEPR',
            'EEPRO',
            'EEPROM',
            'EEPROM_'];

        const pattern2: readonly string[] = [
            'FLASH_V',
            'FLASH512_V',
            'FLASH1M_V',
            'SRAM_V',
            'EEPROM_V',
        ];
        const content = new Uint8Array(rom);
        for (let i = 0xe4; i < content.length; ++i) {
            next = String.fromCharCode(content[i]);
            state += next;
            if (pattern1.includes(state)) {
                continue;
            }
            if (pattern2.includes(state)) {
                return state;
            }
            state = next;
        }
        return null;
    }

    /**
     * 載入遊戲狀態
     * @param save 
     */
    loadSavedata(save: ArrayBuffer): void {
        if (!this.save) {
            throw new Error("save is null");
        }

        (this.save as IMemoryView).replaceData(save, 0);
    };

    private getMemoryView(offset: number): IMemoryView {
        return (this.memory[offset >>> this.BASE_OFFSET] as IMemoryView)
    }

    load8(offset: number): number {
        return this.getMemoryView(offset).load8(offset & 0x00FFFFFF);
    }

    load16(offset: number): number {
        return this.getMemoryView(offset).load16(offset & 0x00FFFFFF);
    }

    load32(offset: number): number {
        return this.getMemoryView(offset).load32(offset & 0x00FFFFFF);
    }

    loadU8(offset: number): number {
        return this.getMemoryView(offset).loadU8(offset & 0x00FFFFFF);
    }

    loadU16(offset: number): number {
        return this.getMemoryView(offset).loadU16(offset & 0x00FFFFFF);
    }

    /**
     * 
     * @param offset 
     * @param value 
     */
    store8(offset: number, value: number): void {
        const maskedOffset = offset & 0x00FFFFFF;
        const memory = this.getMemoryView(offset);
        memory.store8(maskedOffset, value);
        memory.invalidatePage(maskedOffset);
    }

    /**
     * 
     * @param offset 
     * @param value 
     */
    store16(offset: number, value: number): void {
        const maskedOffset = offset & 0x00FFFFFE;
        const memory = this.getMemoryView(offset);
        memory.store16(maskedOffset, value);
        memory.invalidatePage(maskedOffset);
    }

    /**
     * 
     * @param offset 
     * @param value 
     */
    store32(offset: number, value: number): void {
        const maskedOffset = offset & 0x00FFFFFC;
        const memory = this.getMemoryView(offset);
        memory.store32(maskedOffset, value);
        memory.invalidatePage(maskedOffset);
        memory.invalidatePage(maskedOffset + 2);
    }

    // private getCPU(): ICPU {
    //     if (!this.cpu) {
    //         throw new Error("cpu is null");
    //     }

    //     return this.cpu as ICPU;
    // }

    /**
     * 
     * @param memory 
     */
    waitPrefetch(memory: number): void {
        this.getCPU().cycles += 1 + this.waitstatesPrefetch[memory >>> this.BASE_OFFSET];
    }

    /**
     * 
     * @param memory 
     */
    waitPrefetch32(memory: number): void {
        this.getCPU().cycles += 1 + this.waitstatesPrefetch32[memory >>> this.BASE_OFFSET];
    }

    /**
     * 
     * @param memory 
     */
    wait(memory: number): void {
        this.getCPU().cycles += 1 + this.waitstates[memory >>> this.BASE_OFFSET];
    }

    /**
     * 
     * @param memory 
     */
    wait32(memory: number): void {
        this.getCPU().cycles += 1 + this.waitstates32[memory >>> this.BASE_OFFSET];
    }

    /**
     * 
     * @param memory 
     */
    waitSeq(memory: number): void {
        this.getCPU().cycles += 1 + this.waitstatesSeq[memory >>> this.BASE_OFFSET];
    }

    /**
     * 
     * @param memory 
     */
    waitSeq32(memory: number): void {
        this.getCPU().cycles += 1 + this.waitstatesSeq32[memory >>> this.BASE_OFFSET];
    }

    /**
     * 
     * @param rs 
     */
    waitMul(rs: number): void {
        const cpu = this.getCPU();
        if (((rs & 0xFFFFFF00) == 0xFFFFFF00) || !(rs & 0xFFFFFF00)) {
            cpu.cycles += 1;
        } else if (((rs & 0xFFFF0000) == 0xFFFF0000) || !(rs & 0xFFFF0000)) {
            cpu.cycles += 2;
        } else if (((rs & 0xFF000000) == 0xFF000000) || !(rs & 0xFF000000)) {
            cpu.cycles += 3;
        } else {
            cpu.cycles += 4;
        }
    }

    /**
     * 
     * @param memory 
     * @param seq 
     */
    waitMulti32(memory: number, seq: number): void {
        const cpu = this.getCPU();
        cpu.cycles += 1 + this.waitstates32[memory >>> this.BASE_OFFSET];
        cpu.cycles += (1 + this.waitstatesSeq32[memory >>> this.BASE_OFFSET]) * (seq - 1);
    }

    addressToPage(region: number, address: number): number {
        if (!this.memory[region]) {
            throw new Error("memory is invalid");
        }
        const memory = this.memory[region] as IBIOS;
        return address >> memory.ICACHE_PAGE_BITS;
    }

    /**
     * 
     * @param region 
     * @param pageId 
     */
    accessPage(region: number, pageId: number): ICacheData {
        const memory = this.memory[region] as IMemoryView;
        if (!memory.icache) {
            throw new Error("no init icache");
        }
        const bios = this.memory[region] as IBIOS;
        let page = memory.icache[pageId];
        if (!page || (page as ICacheData).invalid) {
            page = {
                thumb: new Array(1 << (bios.ICACHE_PAGE_BITS)),
                arm: new Array(1 << bios.ICACHE_PAGE_BITS - 1),
                invalid: false
            }
            memory.icache[pageId] = page;

        }
        return page;
    }

    scheduleDma(number: DMANumber, info: IDMA): void {
        switch (info.timing) {
            case this.DMA_TIMING_NOW:
                this.serviceDma(number, info);
                break;
            case this.DMA_TIMING_HBLANK:
                // Handled implicitly
                break;
            case this.DMA_TIMING_VBLANK:
                // Handled implicitly
                break;
            case this.DMA_TIMING_CUSTOM:
                switch (number) {
                    case 0:
                        this.core.getLog().WARN('Discarding invalid DMA0 scheduling');
                        break;
                    case 1:
                    case 2:
                        this.getAudio().scheduleFIFODma(number, info);
                        break;
                    // case 3:
                    // this.getIRQ().video.scheduleVCaptureDma(dma, info);
                    // break;
                }
        }
    }

    private getAudio(): IAudio {
        const audio = this.getIRQ().audio;
        if (!audio) {
            throw new Error("audio no init");
        }

        return audio;
    }

    private getIRQ(): IIRQ {
        const irq = this.getCPU().irq;
        return irq as IIRQ;
    }

    /**
     * 
     */
    runHblankDmas(): void {
        const irq = this.getIRQ();
        for (let i = 0; i < irq.dma.length; ++i) {
            const dma = irq.dma[i];
            if (dma.enable && dma.timing == this.DMA_TIMING_HBLANK) {
                this.serviceDma(i as DMANumber, dma);
            }
        }
    }

    /**
     * 
     */
    runVblankDmas(): void {
        const irq = this.getIRQ();
        for (let i = 0; i < irq.dma.length; ++i) {
            const dma = irq.dma[i];
            if (dma.enable && dma.timing == this.DMA_TIMING_VBLANK) {
                this.serviceDma(i as DMANumber, dma);
            }
        }
    }

    /**
     * 
     * @param number 
     * @param info 
     */
    serviceDma(number: DMANumber, info: IDMA): void {
        if (!info.enable) {
            // There was a DMA scheduled that got canceled
            return;
        }

        const width = info.width;
        const sourceOffset = this.DMA_OFFSET[info.srcControl] * width;
        const destOffset = this.DMA_OFFSET[info.dstControl] * width;
        let wordsRemaining = info.nextCount;
        let source = info.nextSource & this.OFFSET_MASK;
        let dest = info.nextDest & this.OFFSET_MASK;
        const sourceRegion = info.nextSource >>> this.BASE_OFFSET;
        const destRegion = info.nextDest >>> this.BASE_OFFSET;
        const sourceBlock = this.memory[sourceRegion];
        const sourceBlockMem = this.memory[sourceRegion] as IMemoryView;
        const destBlock = this.memory[destRegion] as IBIOS;
        const destBlockMem = this.memory[destRegion] as IMemoryView;
        let sourceView = null;
        let destView = null;
        let sourceMask = 0xFFFFFFFF;
        let destMask = 0xFFFFFFFF;
        let word;

        if (destBlock.ICACHE_PAGE_BITS) {
            var endPage = (dest + wordsRemaining * width) >> destBlock.ICACHE_PAGE_BITS;
            for (var i = dest >> destBlock.ICACHE_PAGE_BITS; i <= endPage; ++i) {
                destBlockMem.invalidatePage(i << destBlock.ICACHE_PAGE_BITS);
            }
        }

        if (destRegion == MemoryRegion.WORKING_RAM || destRegion == MemoryRegion.WORKING_IRAM) {
            destView = destBlockMem.view;
            destMask = destBlockMem.mask;
        }

        if (sourceRegion == MemoryRegion.WORKING_RAM || sourceRegion == MemoryRegion.WORKING_IRAM || sourceRegion == MemoryRegion.CART0 || sourceRegion == MemoryRegion.CART1) {
            sourceView = sourceBlockMem.view;
            sourceMask = sourceBlockMem.mask;
        }

        if (sourceBlock && destBlock) {
            if (sourceView && destView) {
                if (width == 4) {
                    source &= 0xFFFFFFFC;
                    dest &= 0xFFFFFFFC;
                    while (wordsRemaining--) {
                        word = sourceView.getInt32(source & sourceMask);
                        destView.setInt32(dest & destMask, word);
                        source += sourceOffset;
                        dest += destOffset;
                    }
                } else {
                    while (wordsRemaining--) {
                        word = sourceView.getUint16(source & sourceMask);
                        destView.setUint16(dest & destMask, word);
                        source += sourceOffset;
                        dest += destOffset;
                    }
                }
            } else if (sourceView) {
                if (width == 4) {
                    source &= 0xFFFFFFFC;
                    dest &= 0xFFFFFFFC;
                    while (wordsRemaining--) {
                        word = sourceView.getInt32(source & sourceMask, true);
                        destBlockMem.store32(dest, word);
                        source += sourceOffset;
                        dest += destOffset;
                    }
                } else {
                    while (wordsRemaining--) {
                        word = sourceView.getUint16(source & sourceMask, true);
                        destBlockMem.store16(dest, word);
                        source += sourceOffset;
                        dest += destOffset;
                    }
                }
            } else {
                if (width == 4) {
                    source &= 0xFFFFFFFC;
                    dest &= 0xFFFFFFFC;
                    while (wordsRemaining--) {
                        word = sourceBlockMem.load32(source);
                        destBlockMem.store32(dest, word);
                        source += sourceOffset;
                        dest += destOffset;
                    }
                } else {
                    while (wordsRemaining--) {
                        word = sourceBlockMem.loadU16(source);
                        destBlockMem.store16(dest, word);
                        source += sourceOffset;
                        dest += destOffset;
                    }
                }
            }
        } else {
            this.getILog().WARN('Invalid DMA');
        }

        if (info.doIrq) {
            info.nextIRQ = this.getCPU().cycles + 2;
            info.nextIRQ += (width == 4 ? this.waitstates32[sourceRegion] + this.waitstates32[destRegion]
                : this.waitstates[sourceRegion] + this.waitstates[destRegion]);
            info.nextIRQ += (info.count - 1) * (width == 4 ? this.waitstatesSeq32[sourceRegion] + this.waitstatesSeq32[destRegion]
                : this.waitstatesSeq[sourceRegion] + this.waitstatesSeq[destRegion]);
        }

        info.nextSource = source | (sourceRegion << this.BASE_OFFSET);
        info.nextDest = dest | (destRegion << this.BASE_OFFSET);
        info.nextCount = wordsRemaining;

        if (!info.repeat) {
            info.enable = false;

            // Clear the enable bit in memory
            if (!this.DMA_REGISTER) {
                throw new Error("dma register invalid");
            }
            const dmaReg = this.DMA_REGISTER[number];
            const io = this.getIIO();
            if(!io.registers){
                throw new Error("io register no init");
            }
            io.registers[dmaReg] &= 0x7FE0;
        } else {
            info.nextCount = info.count;
            if (info.dstControl == this.DMA_INCREMENT_RELOAD) {
                info.nextDest = info.dest;
            }
            this.scheduleDma(number, info);
        }
    }

    private getIIO(): IIO {
        return this.memory[MemoryRegion.IO] as IIO;
    }
    /**
     * 
     * @param word 
     */
    adjustTimings(word: number): void {
        var sram = word & 0x0003;
        var ws0 = (word & 0x000C) >> 2;
        var ws0seq = (word & 0x0010) >> 4;
        var ws1 = (word & 0x0060) >> 5;
        var ws1seq = (word & 0x0080) >> 7;
        var ws2 = (word & 0x0300) >> 8;
        var ws2seq = (word & 0x0400) >> 10;
        var prefetch = word & 0x4000;

        this.waitstates[MemoryRegion.CART_SRAM] = this.ROM_WS[sram];
        this.waitstatesSeq[MemoryRegion.CART_SRAM] = this.ROM_WS[sram];
        this.waitstates32[MemoryRegion.CART_SRAM] = this.ROM_WS[sram];
        this.waitstatesSeq32[MemoryRegion.CART_SRAM] = this.ROM_WS[sram];

        this.waitstates[MemoryRegion.CART0] = this.waitstates[MemoryRegion.CART0 + 1] = this.ROM_WS[ws0];
        this.waitstates[MemoryRegion.CART1] = this.waitstates[MemoryRegion.CART1 + 1] = this.ROM_WS[ws1];
        this.waitstates[MemoryRegion.CART2] = this.waitstates[MemoryRegion.CART2 + 1] = this.ROM_WS[ws2];

        this.waitstatesSeq[MemoryRegion.CART0] = this.waitstatesSeq[MemoryRegion.CART0 + 1] = this.ROM_WS_SEQ[0][ws0seq];
        this.waitstatesSeq[MemoryRegion.CART1] = this.waitstatesSeq[MemoryRegion.CART1 + 1] = this.ROM_WS_SEQ[1][ws1seq];
        this.waitstatesSeq[MemoryRegion.CART2] = this.waitstatesSeq[MemoryRegion.CART2 + 1] = this.ROM_WS_SEQ[2][ws2seq];

        this.waitstates32[MemoryRegion.CART0] = this.waitstates32[MemoryRegion.CART0 + 1] = this.waitstates[MemoryRegion.CART0] + 1 + this.waitstatesSeq[MemoryRegion.CART0];
        this.waitstates32[MemoryRegion.CART1] = this.waitstates32[MemoryRegion.CART1 + 1] = this.waitstates[MemoryRegion.CART1] + 1 + this.waitstatesSeq[MemoryRegion.CART1];
        this.waitstates32[MemoryRegion.CART2] = this.waitstates32[MemoryRegion.CART2 + 1] = this.waitstates[MemoryRegion.CART2] + 1 + this.waitstatesSeq[MemoryRegion.CART2];

        this.waitstatesSeq32[MemoryRegion.CART0] = this.waitstatesSeq32[MemoryRegion.CART0 + 1] = 2 * this.waitstatesSeq[MemoryRegion.CART0] + 1;
        this.waitstatesSeq32[MemoryRegion.CART1] = this.waitstatesSeq32[MemoryRegion.CART1 + 1] = 2 * this.waitstatesSeq[MemoryRegion.CART1] + 1;
        this.waitstatesSeq32[MemoryRegion.CART2] = this.waitstatesSeq32[MemoryRegion.CART2 + 1] = 2 * this.waitstatesSeq[MemoryRegion.CART2] + 1;

        if (prefetch) {
            this.waitstatesPrefetch[MemoryRegion.CART0] = this.waitstatesPrefetch[MemoryRegion.CART0 + 1] = 0;
            this.waitstatesPrefetch[MemoryRegion.CART1] = this.waitstatesPrefetch[MemoryRegion.CART1 + 1] = 0;
            this.waitstatesPrefetch[MemoryRegion.CART2] = this.waitstatesPrefetch[MemoryRegion.CART2 + 1] = 0;

            this.waitstatesPrefetch32[MemoryRegion.CART0] = this.waitstatesPrefetch32[MemoryRegion.CART0 + 1] = 0;
            this.waitstatesPrefetch32[MemoryRegion.CART1] = this.waitstatesPrefetch32[MemoryRegion.CART1 + 1] = 0;
            this.waitstatesPrefetch32[MemoryRegion.CART2] = this.waitstatesPrefetch32[MemoryRegion.CART2 + 1] = 0;
        } else {
            this.waitstatesPrefetch[MemoryRegion.CART0] = this.waitstatesPrefetch[MemoryRegion.CART0 + 1] = this.waitstatesSeq[MemoryRegion.CART0];
            this.waitstatesPrefetch[MemoryRegion.CART1] = this.waitstatesPrefetch[MemoryRegion.CART1 + 1] = this.waitstatesSeq[MemoryRegion.CART1];
            this.waitstatesPrefetch[MemoryRegion.CART2] = this.waitstatesPrefetch[MemoryRegion.CART2 + 1] = this.waitstatesSeq[MemoryRegion.CART2];

            this.waitstatesPrefetch32[MemoryRegion.CART0] = this.waitstatesPrefetch32[MemoryRegion.CART0 + 1] = this.waitstatesSeq32[MemoryRegion.CART0];
            this.waitstatesPrefetch32[MemoryRegion.CART1] = this.waitstatesPrefetch32[MemoryRegion.CART1 + 1] = this.waitstatesSeq32[MemoryRegion.CART1];
            this.waitstatesPrefetch32[MemoryRegion.CART2] = this.waitstatesPrefetch32[MemoryRegion.CART2 + 1] = this.waitstatesSeq32[MemoryRegion.CART2];
        }
    }

    private getISave(): ISave {
        if (!this.save) {
            throw new Error("save is null");
        }

        return this.save as ISave;
    }

    /**
     * 
     */
    saveNeedsFlush(): boolean {
        return this.getISave().writePending;
    }

    /**
     * 
     */
    flushSave(): void {
        this.getISave().writePending = false;
    }

    allocGPIO(rom: IROMView): IGPIO {
        return new GameBoyAdvanceGPIO(this.core.getGBA(), rom);
    }
}