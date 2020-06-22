// Copyright 2018-2020 the Deno authors. All rights reserved. MIT license.

// This is a specialised implementation of a System module loader.

"use strict";

// @ts-nocheck
/* eslint-disable */
let System, __instantiate;
(() => {
  const r = new Map();

  System = {
    register(id, d, f) {
      r.set(id, { d, f, exp: {} });
    },
  };
  async function dI(mid, src) {
    let id = mid.replace(/\.\w+$/i, "");
    if (id.includes("./")) {
      const [o, ...ia] = id.split("/").reverse(),
        [, ...sa] = src.split("/").reverse(),
        oa = [o];
      let s = 0,
        i;
      while ((i = ia.shift())) {
        if (i === "..") s++;
        else if (i === ".") break;
        else oa.push(i);
      }
      if (s < sa.length) oa.push(...sa.slice(s));
      id = oa.reverse().join("/");
    }
    return r.has(id) ? gExpA(id) : import(mid);
  }

  function gC(id, main) {
    return {
      id,
      import: (m) => dI(m, id),
      meta: { url: id, main },
    };
  }

  function gE(exp) {
    return (id, v) => {
      v = typeof id === "string" ? { [id]: v } : id;
      for (const [id, value] of Object.entries(v)) {
        Object.defineProperty(exp, id, {
          value,
          writable: true,
          enumerable: true,
        });
      }
    };
  }

  function rF(main) {
    for (const [id, m] of r.entries()) {
      const { f, exp } = m;
      const { execute: e, setters: s } = f(gE(exp), gC(id, id === main));
      delete m.f;
      m.e = e;
      m.s = s;
    }
  }

  async function gExpA(id) {
    if (!r.has(id)) return;
    const m = r.get(id);
    if (m.s) {
      const { d, e, s } = m;
      delete m.s;
      delete m.e;
      for (let i = 0; i < s.length; i++) s[i](await gExpA(d[i]));
      const r = e();
      if (r) await r;
    }
    return m.exp;
  }

  function gExp(id) {
    if (!r.has(id)) return;
    const m = r.get(id);
    if (m.s) {
      const { d, e, s } = m;
      delete m.s;
      delete m.e;
      for (let i = 0; i < s.length; i++) s[i](gExp(d[i]));
      e();
    }
    return m.exp;
  }
  __instantiate = (m, a) => {
    System = __instantiate = undefined;
    rF(m);
    return a ? gExpA(m) : gExp(m);
  };
})();

System.register("interfaces", [], function (exports_1, context_1) {
    "use strict";
    var ARMMode, ARMBank, OpExecMode, LogLevel;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [],
        execute: function () {
            (function (ARMMode) {
                ARMMode[ARMMode["User"] = 16] = "User";
                ARMMode[ARMMode["System"] = 31] = "System";
                ARMMode[ARMMode["FIQ"] = 17] = "FIQ";
                ARMMode[ARMMode["SVC"] = 19] = "SVC";
                ARMMode[ARMMode["ABT"] = 23] = "ABT";
                ARMMode[ARMMode["IRQ"] = 18] = "IRQ";
                ARMMode[ARMMode["Undef"] = 27] = "Undef"; // Undefine
            })(ARMMode || (ARMMode = {}));
            exports_1("ARMMode", ARMMode);
            (function (ARMBank) {
                ARMBank[ARMBank["NONE"] = 0] = "NONE";
                ARMBank[ARMBank["FIQ"] = 1] = "FIQ";
                ARMBank[ARMBank["IRQ"] = 2] = "IRQ";
                ARMBank[ARMBank["SUPERVISOR"] = 3] = "SUPERVISOR";
                ARMBank[ARMBank["ABORT"] = 4] = "ABORT";
                ARMBank[ARMBank["UNDEFINED"] = 5] = "UNDEFINED";
            })(ARMBank || (ARMBank = {}));
            exports_1("ARMBank", ARMBank);
            (function (OpExecMode) {
                OpExecMode[OpExecMode["ARM"] = 0] = "ARM";
                OpExecMode[OpExecMode["THUMB"] = 1] = "THUMB";
            })(OpExecMode || (OpExecMode = {}));
            exports_1("OpExecMode", OpExecMode);
            (function (LogLevel) {
                LogLevel[LogLevel["Error"] = 0] = "Error";
            })(LogLevel || (LogLevel = {}));
            exports_1("LogLevel", LogLevel);
        }
    };
});
System.register("mmu/MemoryView", [], function (exports_2, context_2) {
    "use strict";
    var MemoryView;
    var __moduleName = context_2 && context_2.id;
    return {
        setters: [],
        execute: function () {
            MemoryView = class MemoryView {
                constructor(memory, offset = 0) {
                    this.mask8 = 0;
                    this.mask16 = 0;
                    this.mask32 = 0;
                    this.icache = [];
                    this.buffer = memory;
                    this.view = new DataView(this.buffer, offset);
                    this.mask = memory.byteLength - 1;
                    this.resetMask();
                }
                resetMask() {
                    this.mask8 = this.mask & 0xFFFFFFFF;
                    this.mask16 = this.mask & 0xFFFFFFFE;
                    this.mask32 = this.mask & 0xFFFFFFFC;
                }
                load8(offset) {
                    return this.view.getInt8(offset & this.mask8);
                }
                /**
                   * Unaligned 16-bit loads are unpredictable...let's just pretend they work
                   * @param offset
                   */
                load16(offset) {
                    return this.view.getInt16(offset & this.mask, true);
                }
                loadU8(offset) {
                    return this.view.getUint8(offset & this.mask8);
                }
                /**
                   * Unaligned 16-bit loads are unpredictable...let's just pretend they work
                   * @param offset
                   */
                loadU16(offset) {
                    return this.view.getUint16(offset & this.mask, true);
                }
                /**
                   * Unaligned 32-bit loads are "rotated" so they make some semblance of sense
                   * @param offset
                   */
                load32(offset) {
                    const rotate = (offset & 3) << 3;
                    const mem = this.view.getInt32(offset & this.mask32, true);
                    return (mem >>> rotate) | (mem << (32 - rotate));
                }
                store8(offset, value) {
                    this.view.setInt8(offset & this.mask8, value);
                }
                store16(offset, value) {
                    this.view.setInt16(offset & this.mask16, value, true);
                }
                store32(offset, value) {
                    this.view.setInt32(offset & this.mask32, value, true);
                }
                invalidatePage(address) { }
                replaceData(memory, offset = 0) {
                    this.buffer = memory;
                    this.view = new DataView(this.buffer, offset);
                    if (this.icache) {
                        this.icache = new Array(this.icache.length);
                    }
                }
            };
            exports_2("default", MemoryView);
        }
    };
});
System.register("mmu/ROMView", ["mmu/MemoryView"], function (exports_3, context_3) {
    "use strict";
    var MemoryView_ts_1, ROMView;
    var __moduleName = context_3 && context_3.id;
    return {
        setters: [
            function (MemoryView_ts_1_1) {
                MemoryView_ts_1 = MemoryView_ts_1_1;
            }
        ],
        execute: function () {
            ROMView = class ROMView extends MemoryView_ts_1.default {
                constructor(rom, offset = 0) {
                    super(rom, offset);
                    this.ICACHE_PAGE_BITS = 10;
                    this.PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;
                    // this.icache = new Array(rom.byteLength >> (this.ICACHE_PAGE_BITS + 1));
                    this.mask = 0x01FFFFFF;
                    this.resetMask();
                }
                #mmu;
                setMMU(mmu) {
                    this.#mmu = mmu;
                }
                store8(offset, value) { }
                store16(offset, value) {
                    if (offset < 0xCA && offset >= 0xC4) {
                        if (!this.gpio) {
                            this.gpio = this.#mmu?.allocGPIO(this);
                        }
                        this.gpio?.store16(offset, value);
                    }
                }
                store32(offset, value) {
                    if (offset < 0xCA && offset >= 0xC4) {
                        if (!this.gpio) {
                            this.gpio = this.#mmu?.allocGPIO(this);
                        }
                        this.gpio?.store32(offset, value);
                    }
                }
            };
            exports_3("default", ROMView);
        }
    };
});
System.register("mmu/BadMemory", ["interfaces"], function (exports_4, context_4) {
    "use strict";
    var interfaces_ts_1, BadMemory;
    var __moduleName = context_4 && context_4.id;
    return {
        setters: [
            function (interfaces_ts_1_1) {
                interfaces_ts_1 = interfaces_ts_1_1;
            }
        ],
        execute: function () {
            BadMemory = class BadMemory {
                constructor(mmu, cpu) {
                    this.cpu = cpu;
                    this.mmu = mmu;
                    this.buffer = new ArrayBuffer(0);
                    this.icache = [];
                }
                load8(offset) {
                    return this.mmu.load8(this.cpu.gprs[this.cpu.PC] - this.cpu.instructionWidth + (offset & 0x3));
                }
                load16(offset) {
                    return this.mmu.load16(this.cpu.gprs[this.cpu.PC] - this.cpu.instructionWidth + (offset & 0x2));
                }
                loadU8(offset) {
                    return this.mmu.loadU8(this.cpu.gprs[this.cpu.PC] - this.cpu.instructionWidth + (offset & 0x3));
                }
                loadU16(offset) {
                    return this.mmu.loadU16(this.cpu.gprs[this.cpu.PC] - this.cpu.instructionWidth + (offset & 0x2));
                }
                load32(offset) {
                    if (this.cpu.execMode == interfaces_ts_1.OpExecMode.ARM) {
                        // return this.mmu.load32(this.cpu.gprs[this.cpu.gprs.PC] - this.cpu.instructionWidth);
                        return this.mmu.load32(this.cpu.gprs[this.cpu.PC] - this.cpu.instructionWidth);
                    }
                    else {
                        var halfword = this.mmu.loadU16(this.cpu.gprs[this.cpu.PC] - this.cpu.instructionWidth);
                        return halfword | (halfword << 16);
                    }
                }
                store8(offset, value) { }
                store16(offset, value) { }
                store32(offset, value) { }
                invalidatePage(address) { }
            };
            exports_4("default", BadMemory);
        }
    };
});
System.register("mmu/MemoryBlock", ["mmu/MemoryView"], function (exports_5, context_5) {
    "use strict";
    var MemoryView_ts_2, MemoryBlock;
    var __moduleName = context_5 && context_5.id;
    return {
        setters: [
            function (MemoryView_ts_2_1) {
                MemoryView_ts_2 = MemoryView_ts_2_1;
            }
        ],
        execute: function () {
            MemoryBlock = class MemoryBlock extends MemoryView_ts_2.default {
                constructor(size, cacheBits) {
                    super(new ArrayBuffer(size));
                    this.ICACHE_PAGE_BITS = cacheBits;
                    this.PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;
                    this.icache = new Array(size >> (this.ICACHE_PAGE_BITS + 1));
                }
                invalidatePage(address) {
                    if (!this.icache) {
                        throw new Error("no init icache");
                    }
                    const page = this.icache[(address & this.mask) >> this.ICACHE_PAGE_BITS];
                    if (page) {
                        page.invalid = true;
                    }
                }
            };
            exports_5("default", MemoryBlock);
        }
    };
});
System.register("mmu/BIOSView", ["mmu/MemoryView"], function (exports_6, context_6) {
    "use strict";
    var MemoryView_ts_3, BIOSView;
    var __moduleName = context_6 && context_6.id;
    return {
        setters: [
            function (MemoryView_ts_3_1) {
                MemoryView_ts_3 = MemoryView_ts_3_1;
            }
        ],
        execute: function () {
            BIOSView = class BIOSView extends MemoryView_ts_3.default {
                constructor(rom, offset = 0) {
                    super(rom, offset);
                    this.real = false;
                    this.ICACHE_PAGE_BITS = 16;
                    this.PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;
                    this.icache = new Array(1);
                }
                load8(offset) {
                    if (offset >= this.buffer.byteLength) {
                        return -1;
                    }
                    return this.view.getInt8(offset);
                }
                load16(offset) {
                    if (offset >= this.buffer.byteLength) {
                        return -1;
                    }
                    return this.view.getInt16(offset, true);
                }
                loadU8(offset) {
                    if (offset >= this.buffer.byteLength) {
                        return -1;
                    }
                    return this.view.getUint8(offset);
                }
                loadU16(offset) {
                    if (offset >= this.buffer.byteLength) {
                        return -1;
                    }
                    return this.view.getUint16(offset, true);
                }
                load32(offset) {
                    if (offset >= this.buffer.byteLength) {
                        return -1;
                    }
                    return this.view.getInt32(offset, true);
                }
                store8(offset, value) { }
                store16(offset, value) { }
                store32(offset, value) { }
            };
            exports_6("default", BIOSView);
        }
    };
});
System.register("mmu/mod", ["mmu/MemoryView"], function (exports_7, context_7) {
    "use strict";
    var MemoryView_ts_4;
    var __moduleName = context_7 && context_7.id;
    return {
        setters: [
            function (MemoryView_ts_4_1) {
                MemoryView_ts_4 = MemoryView_ts_4_1;
            }
        ],
        execute: function () {
            exports_7("MemoryView", MemoryView_ts_4.default);
        }
    };
});
System.register("savedata/EEPROMSavedata", ["mmu/mod"], function (exports_8, context_8) {
    "use strict";
    var mod_ts_1, EEPROMSavedata;
    var __moduleName = context_8 && context_8.id;
    return {
        setters: [
            function (mod_ts_1_1) {
                mod_ts_1 = mod_ts_1_1;
            }
        ],
        execute: function () {
            EEPROMSavedata = class EEPROMSavedata extends mod_ts_1.MemoryView {
                constructor(size, mmu) {
                    super(new ArrayBuffer(size));
                    this.writePending = false;
                    this.COMMAND_NULL = 0;
                    this.COMMAND_PENDING = 1;
                    this.COMMAND_WRITE = 2;
                    this.COMMAND_READ_PENDING = 3;
                    this.COMMAND_READ = 4;
                    this.writeAddress = 0;
                    this.readBitsRemaining = 0;
                    this.readAddress = 0;
                    this.command = 0;
                    this.commandBitsRemaining = 0;
                    this.realSize = 0;
                    this.addressBits = 0;
                    this.mmu = mmu;
                    this.dma = mmu.cpu.irq.dma[3];
                }
                load8(offset) {
                    throw new Error("Unsupported 8-bit access!");
                }
                load16(offset) {
                    return this.loadU16(offset);
                }
                loadU8(offset) {
                    throw new Error("Unsupported 8-bit access!");
                }
                loadU16(offset) {
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
                load32(offset) {
                    throw new Error("Unsupported 32-bit access!");
                }
                store8(offset, value) {
                    throw new Error("Unsupported 8-bit access!");
                }
                store16(offset, value) {
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
                            }
                            else {
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
                            }
                            else if (this.commandBitsRemaining <= 0) {
                                this.command = this.COMMAND_NULL;
                                this.writePending = true;
                            }
                            else {
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
                            }
                            else {
                                this.readBitsRemaining = 68;
                                this.command = this.COMMAND_READ;
                            }
                            break;
                    }
                }
                store32(offset, value) {
                    throw new Error("Unsupported 32-bit access!");
                }
            };
            exports_8("default", EEPROMSavedata);
        }
    };
});
System.register("savedata/FlashSavedata", ["mmu/mod"], function (exports_9, context_9) {
    "use strict";
    var mod_ts_2, FlashSavedata;
    var __moduleName = context_9 && context_9.id;
    return {
        setters: [
            function (mod_ts_2_1) {
                mod_ts_2 = mod_ts_2_1;
            }
        ],
        execute: function () {
            FlashSavedata = /** @class */ (() => {
                class FlashSavedata extends mod_ts_2.MemoryView {
                    constructor(size) {
                        super(new ArrayBuffer(size), 0);
                        this.writePending = false;
                        this.idMode = false;
                        this.first = 0;
                        this.second = 0;
                        this.command = 0;
                        this.pendingCommand = 0;
                        this.bank0 = new DataView(this.buffer, 0, 0x00010000);
                        if (size > 0x00010000) {
                            this.id = FlashSavedata.ID_SANYO;
                            this.bank1 = new DataView(this.buffer, 0x00010000);
                        }
                        else {
                            this.id = FlashSavedata.ID_PANASONIC;
                            this.bank1 = null;
                        }
                        this.bank = this.bank0;
                    }
                    load8(offset) {
                        if (this.idMode && offset < 2) {
                            return (this.id >> (offset << 3)) & 0xFF;
                        }
                        else if (offset < 0x10000) {
                            return this.bank.getInt8(offset);
                        }
                        else {
                            return 0;
                        }
                    }
                    load16(offset) {
                        return (this.load8(offset) & 0xFF) | (this.load8(offset + 1) << 8);
                    }
                    load32(offset) {
                        return (this.load8(offset) & 0xFF) | (this.load8(offset + 1) << 8) | (this.load8(offset + 2) << 16) | (this.load8(offset + 3) << 24);
                    }
                    loadU8(offset) {
                        return this.load8(offset) & 0xFF;
                    }
                    loadU16(offset) {
                        return (this.loadU8(offset) & 0xFF) | (this.loadU8(offset + 1) << 8);
                    }
                    store8(offset, value) {
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
                                    }
                                    else {
                                        this.command = 0;
                                        this.first = value;
                                        this.idMode = false;
                                    }
                                }
                                else if (offset == 0x2AAA && this.first == 0xAA) {
                                    this.first = 0;
                                    if (this.pendingCommand) {
                                        this.command = this.pendingCommand;
                                    }
                                    else {
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
                                    }
                                    else {
                                        this.bank = this.bank0;
                                    }
                                }
                                this.command = 0;
                                break;
                        }
                    }
                    store16(offset, value) {
                        throw new Error("Unaligned save to flash!");
                    }
                    store32(offset, value) {
                        throw new Error("Unaligned save to flash!");
                    }
                    replaceData(memory) {
                        const bank = this.view === this.bank1;
                        super.replaceData(memory, 0);
                        this.bank0 = new DataView(this.buffer, 0, 0x00010000);
                        if (memory.byteLength > 0x00010000) {
                            this.bank1 = new DataView(this.buffer, 0x00010000);
                        }
                        else {
                            this.bank1 = null;
                        }
                        if (bank && !this.bank1) {
                            throw new Error("no init bank");
                        }
                        this.bank = bank ? this.bank1 : this.bank0;
                    }
                }
                FlashSavedata.COMMAND_WIPE = 0x10;
                FlashSavedata.COMMAND_ERASE_SECTOR = 0x30;
                FlashSavedata.COMMAND_ERASE = 0x80;
                FlashSavedata.COMMAND_ID = 0x90;
                FlashSavedata.COMMAND_WRITE = 0xA0;
                FlashSavedata.COMMAND_SWITCH_BANK = 0xB0;
                FlashSavedata.COMMAND_TERMINATE_ID = 0xF0;
                FlashSavedata.ID_PANASONIC = 0x1B32;
                FlashSavedata.ID_SANYO = 0x1362;
                return FlashSavedata;
            })();
            exports_9("default", FlashSavedata);
        }
    };
});
System.register("savedata/SRAMSavedata", ["mmu/mod"], function (exports_10, context_10) {
    "use strict";
    var mod_ts_3, SRAMSavedata;
    var __moduleName = context_10 && context_10.id;
    return {
        setters: [
            function (mod_ts_3_1) {
                mod_ts_3 = mod_ts_3_1;
            }
        ],
        execute: function () {
            SRAMSavedata = class SRAMSavedata extends mod_ts_3.MemoryView {
                constructor(size) {
                    super(new ArrayBuffer(size));
                    this.writePending = false;
                }
                store8(offset, value) {
                    this.view.setInt8(offset, value);
                    this.writePending = true;
                }
                store16(offset, value) {
                    this.view.setInt16(offset, value, true);
                    this.writePending = true;
                }
                store32(offset, value) {
                    this.view.setInt32(offset, value, true);
                    this.writePending = true;
                }
            };
            exports_10("default", SRAMSavedata);
        }
    };
});
// https://github.com/mgba-emu/mgba/blob/master/src/gba/savedata.c
// SRAM
// FLASH1M
// FLASH512
// EEPROM
// EEPROM512
System.register("savedata/mod", ["savedata/EEPROMSavedata", "savedata/FlashSavedata", "savedata/SRAMSavedata"], function (exports_11, context_11) {
    "use strict";
    var EEPROMSavedata_ts_1, FlashSavedata_ts_1, SRAMSavedata_ts_1;
    var __moduleName = context_11 && context_11.id;
    return {
        setters: [
            function (EEPROMSavedata_ts_1_1) {
                EEPROMSavedata_ts_1 = EEPROMSavedata_ts_1_1;
            },
            function (FlashSavedata_ts_1_1) {
                FlashSavedata_ts_1 = FlashSavedata_ts_1_1;
            },
            function (SRAMSavedata_ts_1_1) {
                SRAMSavedata_ts_1 = SRAMSavedata_ts_1_1;
            }
        ],
        execute: function () {
            exports_11("EEPROMSavedata", EEPROMSavedata_ts_1.default);
            exports_11("FlashSavedata", FlashSavedata_ts_1.default);
            exports_11("SRAMSavedata", SRAMSavedata_ts_1.default);
        }
    };
});

const __exp = __instantiate("savedata/mod", false);
export const EEPROMSavedata = __exp["EEPROMSavedata"];
export const FlashSavedata = __exp["FlashSavedata"];
export const SRAMSavedata = __exp["SRAMSavedata"];
