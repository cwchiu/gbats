import { IMMU, ICPU, IMemoryView, OpExecMode, ICacheData } from "../interfaces.ts";

export default class BadMemory implements IMemoryView {
    mmu: IMMU;
    cpu: ICPU;
    buffer: ArrayBuffer
    icache: Array<ICacheData>
    view: DataView
    mask: number = 0
    constructor(mmu: IMMU, cpu: ICPU) {
        this.cpu = cpu;
        this.mmu = mmu;
        this.buffer = new ArrayBuffer(0);
        this.view = new DataView(this.buffer);
        this.icache = [];
    }

    load8(offset: number): number {
        return this.mmu.load8(
            this.cpu.gprs[this.cpu.PC] - this.cpu.instructionWidth + (offset & 0x3),
        );
    }

    load16(offset: number): number {
        return this.mmu.load16(
            this.cpu.gprs[this.cpu.PC] - this.cpu.instructionWidth + (offset & 0x2),
        );
    }

    loadU8(offset: number): number {
        return this.mmu.loadU8(
            this.cpu.gprs[this.cpu.PC] - this.cpu.instructionWidth + (offset & 0x3),
        );
    }

    loadU16(offset: number): number {
        return this.mmu.loadU16(
            this.cpu.gprs[this.cpu.PC] - this.cpu.instructionWidth + (offset & 0x2),
        );
    }

    load32(offset: number): number {
        if (this.cpu.execMode == OpExecMode.ARM) {
            // return this.mmu.load32(this.cpu.gprs[this.cpu.gprs.PC] - this.cpu.instructionWidth);
            return this.mmu.load32(
                this.cpu.gprs[this.cpu.PC] - this.cpu.instructionWidth,
            );
        } else {
            var halfword = this.mmu.loadU16(
                this.cpu.gprs[this.cpu.PC] - this.cpu.instructionWidth,
            );
            return halfword | (halfword << 16);
        }
    }

    store8(offset: number, value: number): void { }

    store16(offset: number, value: number): void { }

    store32(offset: number, value: number): void { }

    invalidatePage(address: number): void { }

    replaceData(memory: ArrayBuffer, offset: number = 0): void {
    }
}
