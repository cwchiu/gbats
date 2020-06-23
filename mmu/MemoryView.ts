import { IMemoryView, ICacheData } from "../interfaces.ts";

export default class MemoryView implements IMemoryView {
  buffer: ArrayBuffer;
  view: DataView;
  mask: number;
  mask8: number = 0;
  mask16: number = 0;
  mask32: number = 0;
  icache: Array<ICacheData> = [];

  constructor(memory: ArrayBuffer, offset: number = 0) {
    this.buffer = memory;
    this.view = new DataView(this.buffer, offset);
    this.mask = memory.byteLength - 1;

    this.resetMask();
  }

  protected resetMask(): void {
    this.mask8 = this.mask & 0xFFFFFFFF;
    this.mask16 = this.mask & 0xFFFFFFFE;
    this.mask32 = this.mask & 0xFFFFFFFC;
  }

  load8(offset: number): number {
    return this.view.getInt8(offset & this.mask8);
  }

  /**
     * Unaligned 16-bit loads are unpredictable...let's just pretend they work
     * @param offset 
     */
  load16(offset: number): number {
    return this.view.getInt16(offset & this.mask, true);
  }

  loadU8(offset: number): number {
    return this.view.getUint8(offset & this.mask8);
  }

  /**
     * Unaligned 16-bit loads are unpredictable...let's just pretend they work
     * @param offset 
     */
  loadU16(offset: number): number {
    return this.view.getUint16(offset & this.mask, true);
  }

  /**
     * Unaligned 32-bit loads are "rotated" so they make some semblance of sense
     * @param offset 
     */
  load32(offset: number): number {
    const rotate = (offset & 3) << 3;
    const mem = this.view.getInt32(offset & this.mask32, true);
    return (mem >>> rotate) | (mem << (32 - rotate));
  }

  store8(offset: number, value: number): void {
    this.view.setInt8(offset & this.mask8, value);
  }

  store16(offset: number, value: number): void {
    this.view.setInt16(offset & this.mask16, value, true);
  }

  store32(offset: number, value: number): void {
    this.view.setInt32(offset & this.mask32, value, true);
  }

  invalidatePage(address: number): void {}

  replaceData(memory: ArrayBuffer, offset: number = 0): void {
    this.buffer = memory;
    this.view = new DataView(this.buffer, offset);
    if (this.icache) {
      this.icache = new Array(this.icache.length);
    }
  }
}
