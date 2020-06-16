import { ISave, IMMU, IDMA } from "../interfaces.ts";
import { MemoryView } from "../mmu/mod.ts";

export default class EEPROMSavedata extends MemoryView implements ISave {
  writePending: boolean = false;
  mmu: IMMU;
  dma: IDMA;

  readonly COMMAND_NULL = 0;
  readonly COMMAND_PENDING = 1;
  readonly COMMAND_WRITE = 2;
  readonly COMMAND_READ_PENDING = 3;
  readonly COMMAND_READ = 4;
  writeAddress = 0;
  readBitsRemaining = 0;
  readAddress = 0;
  command = 0;
  commandBitsRemaining = 0;
  realSize = 0;
  addressBits = 0;

  constructor(size: number, mmu: IMMU) {
    super(new ArrayBuffer(size));
    this.mmu = mmu;
    this.dma = mmu.core.irq.dma[3];
  }

  load8(offset: number): number {
    throw new Error("Unsupported 8-bit access!");
  }

  load16(offset: number): number {
    return this.loadU16(offset);
  }

  loadU8(offset: number): number {
    throw new Error("Unsupported 8-bit access!");
  }

  loadU16(offset: number): number {
    if (this.command != this.COMMAND_READ || !this.dma.enable) {
      return 1;
    }
    --this.readBitsRemaining;
    if (this.readBitsRemaining < 64) {
      const step = 63 - this.readBitsRemaining;
      const data = this.view.getUint8((this.readAddress + step) >> 3) >>
        (0x7 - (step & 0x7));
      if (!this.readBitsRemaining) {
        this.command = this.COMMAND_NULL;
      }
      return data & 0x1;
    }
    return 0;
  }

  load32(offset: number): number {
    throw new Error("Unsupported 32-bit access!");
  }

  store8(offset: number, value: number): void {
    throw new Error("Unsupported 8-bit access!");
  }

  store16(offset: number, value: number): void {
    switch (this.command) {
      // Read header
      case this.COMMAND_NULL:
      default:
        this.command = value & 0x1;
        break;
      case this.COMMAND_PENDING:
        this.command <<= 1;
        this.command |= value & 0x1;
        if (this.command == this.COMMAND_WRITE) {
          if (!this.realSize) {
            var bits = this.dma.count - 67;
            this.realSize = 8 << bits;
            this.addressBits = bits;
          }
          this.commandBitsRemaining = this.addressBits + 64 + 1;
          this.writeAddress = 0;
        } else {
          if (!this.realSize) {
            var bits = this.dma.count - 3;
            this.realSize = 8 << bits;
            this.addressBits = bits;
          }
          this.commandBitsRemaining = this.addressBits + 1;
          this.readAddress = 0;
        }
        break;
      // Do commands
      case this.COMMAND_WRITE:
        // Write
        if (--this.commandBitsRemaining > 64) {
          this.writeAddress <<= 1;
          this.writeAddress |= (value & 0x1) << 6;
        } else if (this.commandBitsRemaining <= 0) {
          this.command = this.COMMAND_NULL;
          this.writePending = true;
        } else {
          var current = this.view.getUint8(this.writeAddress >> 3);
          current &= ~(1 << (0x7 - (this.writeAddress & 0x7)));
          current |= (value & 0x1) << (0x7 - (this.writeAddress & 0x7));
          this.view.setUint8(this.writeAddress >> 3, current);
          ++this.writeAddress;
        }
        break;
      case this.COMMAND_READ_PENDING:
        // Read
        if (--this.commandBitsRemaining > 0) {
          this.readAddress <<= 1;
          if (value & 0x1) {
            this.readAddress |= 0x40;
          }
        } else {
          this.readBitsRemaining = 68;
          this.command = this.COMMAND_READ;
        }
        break;
    }
  }

  store32(offset: number, value: number): void {
    throw new Error("Unsupported 32-bit access!");
  }
}
