import {IMemoryView, ICacheData} from "../interfaces.ts";

export default class MemoryAligned16 implements IMemoryView {
    buffer: Uint16Array    
    icache: Array<ICacheData> = []
    view: DataView
    mask: number = 0

    constructor(size: number) {
        this.buffer = new Uint16Array(size >> 1);
        this.view = new DataView(this.buffer.buffer);
    }

    replaceData(memory: ArrayBuffer, offset: number): void {
        throw new Error("no imp");
    }

    load8(offset: number): number {
        return (this.loadU8(offset) << 24) >> 24;
    }

    load16(offset: number): number {
        return (this.loadU16(offset) << 16) >> 16
    }

    loadU8(offset: number): number {
        const index = offset >> 1;
        if (offset & 1) {
            return (this.buffer[index] & 0xFF00) >>> 8;
        } else {
            return this.buffer[index] & 0x00FF;
        }
    }

    loadU16(offset: number): number {
        return this.buffer[offset >> 1];
    }

    load32(offset: number): number {
        return this.buffer[(offset >> 1) & ~1] | (this.buffer[(offset >> 1) | 1] << 16);
    }

    store8(offset: number, value: number): void {
        const index = offset >> 1;
        this.store16(offset, (value << 8) | value);
    }

    store16(offset: number, value: number): void {
        this.buffer[offset >> 1] = value;
    }

    store32(offset: number, value: number): void {
        const index = offset >> 1;
        this.store16(offset, this.buffer[index] = value & 0xFFFF);
        this.store16(offset + 2, this.buffer[index + 1] = value >>> 16);
    }

    insert(start: number, data: ArrayLike<number>): void {
        this.buffer.set(data, start);
    }

    invalidatePage(address: number): void { }

}