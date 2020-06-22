import MemoryView from "./MemoryView.ts";
import { IBIOS } from "../interfaces.ts";

export default class BIOSView extends MemoryView implements IBIOS {
  ICACHE_PAGE_BITS: number;
  PAGE_MASK: number;
  real: boolean = false;

  constructor(rom: ArrayBuffer, offset: number = 0) {
    super(rom, offset);
    this.ICACHE_PAGE_BITS = 16;
    this.PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;
    this.icache = new Array(1);
  }

  load8(offset: number): number {
    if (offset >= this.buffer.byteLength) {
      return -1;
    }
    return this.view.getInt8(offset);
  }

  load16(offset: number): number {
    if (offset >= this.buffer.byteLength) {
      return -1;
    }
    return this.view.getInt16(offset, true);
  }

  loadU8(offset: number): number {
    if (offset >= this.buffer.byteLength) {
      return -1;
    }
    return this.view.getUint8(offset);
  }

  loadU16(offset: number): number {
    if (offset >= this.buffer.byteLength) {
      return -1;
    }
    return this.view.getUint16(offset, true);
  }

  load32(offset: number): number {
    if (offset >= this.buffer.byteLength) {
      return -1;
    }
    return this.view.getInt32(offset, true);
  }

  store8(offset: number, value: number): void {}

  store16(offset: number, value: number): void {}

  store32(offset: number, value: number): void {}
}
