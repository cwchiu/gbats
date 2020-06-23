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
    var MemoryRegion, MemoryRegionSize, ARMMode, ARMBank, OpExecMode, LogLevel;
    var __moduleName = context_1 && context_1.id;
    return {
        setters: [],
        execute: function () {
            (function (MemoryRegion) {
                MemoryRegion[MemoryRegion["BIOS"] = 0] = "BIOS";
                MemoryRegion[MemoryRegion["WORKING_RAM"] = 2] = "WORKING_RAM";
                MemoryRegion[MemoryRegion["WORKING_IRAM"] = 3] = "WORKING_IRAM";
                MemoryRegion[MemoryRegion["IO"] = 4] = "IO";
                MemoryRegion[MemoryRegion["PALETTE_RAM"] = 5] = "PALETTE_RAM";
                MemoryRegion[MemoryRegion["VRAM"] = 6] = "VRAM";
                MemoryRegion[MemoryRegion["OAM"] = 7] = "OAM";
                MemoryRegion[MemoryRegion["CART0"] = 8] = "CART0";
                MemoryRegion[MemoryRegion["CART1"] = 10] = "CART1";
                MemoryRegion[MemoryRegion["CART2"] = 12] = "CART2";
                MemoryRegion[MemoryRegion["CART_SRAM"] = 14] = "CART_SRAM";
            })(MemoryRegion || (MemoryRegion = {}));
            exports_1("MemoryRegion", MemoryRegion);
            (function (MemoryRegionSize) {
                MemoryRegionSize[MemoryRegionSize["BIOS"] = 16384] = "BIOS";
                MemoryRegionSize[MemoryRegionSize["WORKING_RAM"] = 262144] = "WORKING_RAM";
                MemoryRegionSize[MemoryRegionSize["WORKING_IRAM"] = 32768] = "WORKING_IRAM";
                MemoryRegionSize[MemoryRegionSize["IO"] = 1024] = "IO";
                MemoryRegionSize[MemoryRegionSize["PALETTE_RAM"] = 1024] = "PALETTE_RAM";
                MemoryRegionSize[MemoryRegionSize["VRAM"] = 98304] = "VRAM";
                MemoryRegionSize[MemoryRegionSize["OAM"] = 1024] = "OAM";
                MemoryRegionSize[MemoryRegionSize["CART0"] = 33554432] = "CART0";
                MemoryRegionSize[MemoryRegionSize["CART1"] = 33554432] = "CART1";
                MemoryRegionSize[MemoryRegionSize["CART2"] = 33554432] = "CART2";
                MemoryRegionSize[MemoryRegionSize["CART_SRAM"] = 32768] = "CART_SRAM";
                MemoryRegionSize[MemoryRegionSize["CART_FLASH512"] = 65536] = "CART_FLASH512";
                MemoryRegionSize[MemoryRegionSize["CART_FLASH1M"] = 131072] = "CART_FLASH1M";
                MemoryRegionSize[MemoryRegionSize["CART_EEPROM"] = 8192] = "CART_EEPROM";
            })(MemoryRegionSize || (MemoryRegionSize = {}));
            exports_1("MemoryRegionSize", MemoryRegionSize);
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
System.register("mmu/MemoryBlock", ["mmu/MemoryView"], function (exports_3, context_3) {
    "use strict";
    var MemoryView_ts_1, MemoryBlock;
    var __moduleName = context_3 && context_3.id;
    return {
        setters: [
            function (MemoryView_ts_1_1) {
                MemoryView_ts_1 = MemoryView_ts_1_1;
            }
        ],
        execute: function () {
            MemoryBlock = class MemoryBlock extends MemoryView_ts_1.default {
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
            exports_3("default", MemoryBlock);
        }
    };
});
System.register("mmu/BIOSView", ["mmu/MemoryView"], function (exports_4, context_4) {
    "use strict";
    var MemoryView_ts_2, BIOSView;
    var __moduleName = context_4 && context_4.id;
    return {
        setters: [
            function (MemoryView_ts_2_1) {
                MemoryView_ts_2 = MemoryView_ts_2_1;
            }
        ],
        execute: function () {
            BIOSView = class BIOSView extends MemoryView_ts_2.default {
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
            exports_4("default", BIOSView);
        }
    };
});
System.register("mmu/BadMemory", ["interfaces"], function (exports_5, context_5) {
    "use strict";
    var interfaces_ts_1, BadMemory;
    var __moduleName = context_5 && context_5.id;
    return {
        setters: [
            function (interfaces_ts_1_1) {
                interfaces_ts_1 = interfaces_ts_1_1;
            }
        ],
        execute: function () {
            BadMemory = class BadMemory {
                constructor(mmu, cpu) {
                    this.mask = 0;
                    this.cpu = cpu;
                    this.mmu = mmu;
                    this.buffer = new ArrayBuffer(0);
                    this.view = new DataView(this.buffer);
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
                replaceData(memory, offset = 0) {
                }
            };
            exports_5("default", BadMemory);
        }
    };
});
System.register("mmu/ROMView", ["mmu/MemoryView"], function (exports_6, context_6) {
    "use strict";
    var MemoryView_ts_3, ROMView;
    var __moduleName = context_6 && context_6.id;
    return {
        setters: [
            function (MemoryView_ts_3_1) {
                MemoryView_ts_3 = MemoryView_ts_3_1;
            }
        ],
        execute: function () {
            ROMView = class ROMView extends MemoryView_ts_3.default {
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
            exports_6("default", ROMView);
        }
    };
});
System.register("gpio/GameBoyAdvanceRTC", [], function (exports_7, context_7) {
    "use strict";
    var GameBoyAdvanceRTC;
    var __moduleName = context_7 && context_7.id;
    return {
        setters: [],
        execute: function () {
            GameBoyAdvanceRTC = class GameBoyAdvanceRTC {
                constructor(gpio) {
                    this.read = false;
                    this.gpio = gpio;
                    // PINOUT: SCK | SIO | CS | -
                    this.pins = 0;
                    this.direction = 0;
                    this.totalBytes = [
                        0,
                        0,
                        7,
                        0,
                        1,
                        0,
                        3,
                        0 // Empty
                    ];
                    this.bytesRemaining = 0;
                    // Transfer sequence:
                    // == Initiate
                    // > HI | - | LO | -
                    // > HI | - | HI | -
                    // == Transfer bit (x8)
                    // > LO | x | HI | -
                    // > HI | - | HI | -
                    // < ?? | x | ?? | -
                    // == Terminate
                    // >  - | - | LO | -
                    this.transferStep = 0;
                    this.reading = 0;
                    this.bitsRead = 0;
                    this.bits = 0;
                    this.command = -1;
                    this.control = 0x40;
                    this.time = [
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0 // Second
                    ];
                }
                setPins(nybble) {
                    switch (this.transferStep) {
                        case 0:
                            if ((nybble & 5) == 1) {
                                this.transferStep = 1;
                            }
                            break;
                        case 1:
                            if (nybble & 4) {
                                this.transferStep = 2;
                            }
                            break;
                        case 2:
                            if (!(nybble & 1)) {
                                this.bits &= ~(1 << this.bitsRead);
                                this.bits |= ((nybble & 2) >> 1) << this.bitsRead;
                            }
                            else {
                                if (nybble & 4) {
                                    // SIO direction should always != this.read
                                    if ((this.direction & 2) && !this.read) {
                                        ++this.bitsRead;
                                        if (this.bitsRead == 8) {
                                            this.processByte();
                                        }
                                    }
                                    else {
                                        this.gpio.outputPins(5 | (this.sioOutputPin() << 1));
                                        ++this.bitsRead;
                                        if (this.bitsRead == 8) {
                                            --this.bytesRemaining;
                                            if (this.bytesRemaining <= 0) {
                                                this.command = -1;
                                            }
                                            this.bitsRead = 0;
                                        }
                                    }
                                }
                                else {
                                    this.bitsRead = 0;
                                    this.bytesRemaining = 0;
                                    this.command = -1;
                                    this.transferStep = 0;
                                }
                            }
                            break;
                    }
                    this.pins = nybble & 7;
                }
                setDirection(direction) {
                    this.direction = direction;
                }
                processByte() {
                    --this.bytesRemaining;
                    switch (this.command) {
                        case -1:
                            if ((this.bits & 0x0F) == 0x06) {
                                this.command = (this.bits >> 4) & 7;
                                this.reading = this.bits & 0x80;
                                this.bytesRemaining = this.totalBytes[this.command];
                                switch (this.command) {
                                    case 0:
                                        this.control = 0;
                                        break;
                                    case 2:
                                    case 6:
                                        this.updateClock();
                                        break;
                                }
                            }
                            else {
                                this.gpio.core.WARN('Invalid RTC command byte: ' + this.bits.toString(16));
                            }
                            break;
                        case 4:
                            // Control
                            this.control = this.bits & 0x40;
                            break;
                    }
                    this.bits = 0;
                    this.bitsRead = 0;
                    if (!this.bytesRemaining) {
                        this.command = -1;
                    }
                }
                sioOutputPin() {
                    let outputByte = 0;
                    switch (this.command) {
                        case 4:
                            outputByte = this.control;
                            break;
                        case 2:
                        case 6:
                            outputByte = this.time[7 - this.bytesRemaining];
                            break;
                    }
                    return (outputByte >> this.bitsRead) & 1;
                }
                updateClock() {
                    var date = new Date();
                    this.time[0] = this.bcd(date.getFullYear());
                    this.time[1] = this.bcd(date.getMonth() + 1);
                    this.time[2] = this.bcd(date.getDate());
                    this.time[3] = date.getDay() - 1;
                    if (this.time[3] < 0) {
                        this.time[3] = 6;
                    }
                    if (this.control & 0x40) {
                        // 24 hour
                        this.time[4] = this.bcd(date.getHours());
                    }
                    else {
                        this.time[4] = this.bcd(date.getHours() % 2);
                        if (date.getHours() >= 12) {
                            this.time[4] |= 0x80;
                        }
                    }
                    this.time[5] = this.bcd(date.getMinutes());
                    this.time[6] = this.bcd(date.getSeconds());
                }
                bcd(binary) {
                    var counter = binary % 10;
                    binary /= 10;
                    counter += (binary % 10) << 4;
                    return counter;
                }
            };
            exports_7("default", GameBoyAdvanceRTC);
        }
    };
});
System.register("gpio/GameBoyAdvanceGPIO", ["gpio/GameBoyAdvanceRTC"], function (exports_8, context_8) {
    "use strict";
    var GameBoyAdvanceRTC_ts_1, GameBoyAdvanceGPIO;
    var __moduleName = context_8 && context_8.id;
    return {
        setters: [
            function (GameBoyAdvanceRTC_ts_1_1) {
                GameBoyAdvanceRTC_ts_1 = GameBoyAdvanceRTC_ts_1_1;
            }
        ],
        execute: function () {
            GameBoyAdvanceGPIO = class GameBoyAdvanceGPIO {
                constructor(core, rom) {
                    this.core = core;
                    this.rom = rom;
                    this.readWrite = 0;
                    this.direction = 0;
                    this.device = new GameBoyAdvanceRTC_ts_1.default(this); // TODO: Support more devices
                }
                store16(offset, value) {
                    switch (offset) {
                        case 0xC4:
                            this.device.setPins(value & 0xF);
                            break;
                        case 0xC6:
                            this.direction = value & 0xF;
                            this.device.setDirection(this.direction);
                            break;
                        case 0xC8:
                            this.readWrite = value & 1;
                            break;
                        default:
                            throw new Error('BUG: Bad offset passed to GPIO: ' + offset.toString(16));
                    }
                    if (this.readWrite) {
                        var old = this.rom.view.getUint16(offset, true);
                        old &= ~this.direction;
                        this.rom.view.setUint16(offset, old | (value & this.direction), true);
                    }
                }
                store32(offset, value) {
                    throw new Error("no implements");
                }
                outputPins(nybble) {
                    if (this.readWrite) {
                        let old = this.rom.view.getUint16(0xC4, true);
                        old &= this.direction;
                        this.rom.view.setUint16(0xC4, old | (nybble & ~this.direction & 0xF), true);
                    }
                }
            };
            exports_8("default", GameBoyAdvanceGPIO);
        }
    };
});
System.register("utils", [], function (exports_9, context_9) {
    "use strict";
    var Serializer;
    var __moduleName = context_9 && context_9.id;
    function hex(number, leading, usePrefix = false) {
        if (typeof (usePrefix) === 'undefined') {
            usePrefix = true;
        }
        if (typeof (leading) === 'undefined') {
            leading = 8;
        }
        const string = (number >>> 0).toString(16).toUpperCase();
        leading -= string.length;
        if (leading < 0)
            return string;
        return (usePrefix ? '0x' : '') + new Array(leading + 1).join('0') + string;
    }
    exports_9("hex", hex);
    return {
        setters: [],
        execute: function () {
            Serializer = /** @class */ (() => {
                class Serializer {
                    static prefix(value) {
                        return new Blob([Serializer.pack(value.byteLength), value], { type: Serializer.TYPE });
                    }
                    static pack(value) {
                        const object = new DataView(new ArrayBuffer(4));
                        object.setUint32(0, value, true);
                        return object.buffer;
                    }
                }
                Serializer.TYPE = 'application/octet-stream';
                return Serializer;
            })();
            exports_9("Serializer", Serializer);
        }
    };
});
System.register("gpio/GameBoyAdvanceSIO", ["utils"], function (exports_10, context_10) {
    "use strict";
    var utils_ts_1, GameBoyAdvanceSIO;
    var __moduleName = context_10 && context_10.id;
    return {
        setters: [
            function (utils_ts_1_1) {
                utils_ts_1 = utils_ts_1_1;
            }
        ],
        execute: function () {
            GameBoyAdvanceSIO = class GameBoyAdvanceSIO {
                constructor() {
                    this.mode = 0;
                    this.sd = false;
                    this.irq = 0;
                    this.linkLayer = null;
                    this.SIO_NORMAL_8 = 0;
                    this.SIO_NORMAL_32 = 1;
                    this.SIO_MULTI = 2;
                    this.SIO_UART = 3;
                    this.SIO_GPIO = 8;
                    this.SIO_JOYBUS = 12;
                    this.BAUD = [9600, 38400, 57600, 115200];
                }
                clear() {
                    this.mode = this.SIO_GPIO;
                    this.sd = false;
                    this.irq = 0;
                    this.multiplayer = {
                        baud: 0,
                        si: 0,
                        id: 0,
                        error: 0,
                        busy: 0,
                        irq: 0,
                        states: [0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF]
                    };
                    this.linkLayer = null;
                }
                /**
                 *
                 * @param mode
                 */
                setMode(mode) {
                    if (mode & 0x8) {
                        mode &= 0xC;
                    }
                    else {
                        mode &= 0x3;
                    }
                    this.mode = mode;
                    this.core.INFO('Setting SIO mode to ' + utils_ts_1.hex(mode, 1));
                }
                /**
                 *
                 * @param value
                 */
                writeRCNT(value) {
                    if (this.mode != this.SIO_GPIO) {
                        return;
                    }
                    this.core.STUB('General purpose serial not supported');
                }
                /**
                 *
                 * @param value
                 */
                writeSIOCNT(value) {
                    switch (this.mode) {
                        case this.SIO_NORMAL_8:
                            this.core.STUB('8-bit transfer unsupported');
                            break;
                        case this.SIO_NORMAL_32:
                            this.core.STUB('32-bit transfer unsupported');
                            break;
                        case this.SIO_MULTI:
                            this.multiplayer.baud = value & 0x0003;
                            if (this.linkLayer) {
                                this.linkLayer.setBaud(this.BAUD[this.multiplayer.baud]);
                            }
                            if (!this.multiplayer.si) {
                                this.multiplayer.busy = value & 0x0080;
                                if (this.linkLayer && this.multiplayer.busy) {
                                    this.linkLayer.startMultiplayerTransfer();
                                }
                            }
                            this.irq = value & 0x4000;
                            break;
                        case this.SIO_UART:
                            this.core.STUB('UART unsupported');
                            break;
                        case this.SIO_GPIO:
                            // This register isn't used in general-purpose mode
                            break;
                        case this.SIO_JOYBUS:
                            this.core.STUB('JOY BUS unsupported');
                            break;
                    }
                }
                /**
                 *
                 */
                readSIOCNT() {
                    var value = (this.mode << 12) & 0xFFFF;
                    switch (this.mode) {
                        case this.SIO_NORMAL_8:
                            this.core.STUB('8-bit transfer unsupported');
                            break;
                        case this.SIO_NORMAL_32:
                            this.core.STUB('32-bit transfer unsupported');
                            break;
                        case this.SIO_MULTI:
                            value |= this.multiplayer.baud;
                            value |= this.multiplayer.si;
                            value |= (!!this.sd ? 1 : 0) << 3;
                            value |= this.multiplayer.id << 4;
                            value |= this.multiplayer.error;
                            value |= this.multiplayer.busy;
                            value |= (!!this.multiplayer.irq ? 1 : 0) << 14;
                            break;
                        case this.SIO_UART:
                            this.core.STUB('UART unsupported');
                            break;
                        case this.SIO_GPIO:
                            // This register isn't used in general-purpose mode
                            break;
                        case this.SIO_JOYBUS:
                            this.core.STUB('JOY BUS unsupported');
                            break;
                    }
                    return value;
                }
                /**
                 *
                 * @param slot
                 */
                read(slot) {
                    switch (this.mode) {
                        case this.SIO_NORMAL_32:
                            this.core.STUB('32-bit transfer unsupported');
                            break;
                        case this.SIO_MULTI:
                            return this.multiplayer.states[slot];
                        case this.SIO_UART:
                            this.core.STUB('UART unsupported');
                            break;
                        default:
                            this.core.WARN('Reading from transfer register in unsupported mode');
                            break;
                    }
                    return 0;
                }
            };
            exports_10("default", GameBoyAdvanceSIO);
        }
    };
});
System.register("gpio/mod", ["gpio/GameBoyAdvanceGPIO", "gpio/GameBoyAdvanceSIO"], function (exports_11, context_11) {
    "use strict";
    var GameBoyAdvanceGPIO_ts_1, GameBoyAdvanceSIO_ts_1;
    var __moduleName = context_11 && context_11.id;
    return {
        setters: [
            function (GameBoyAdvanceGPIO_ts_1_1) {
                GameBoyAdvanceGPIO_ts_1 = GameBoyAdvanceGPIO_ts_1_1;
            },
            function (GameBoyAdvanceSIO_ts_1_1) {
                GameBoyAdvanceSIO_ts_1 = GameBoyAdvanceSIO_ts_1_1;
            }
        ],
        execute: function () {
            exports_11("GameBoyAdvanceGPIO", GameBoyAdvanceGPIO_ts_1.default);
            exports_11("GameBoyAdvanceSIO", GameBoyAdvanceSIO_ts_1.default);
        }
    };
});
System.register("savedata/EEPROMSavedata", ["mmu/MemoryView"], function (exports_12, context_12) {
    "use strict";
    var MemoryView_ts_4, EEPROMSavedata;
    var __moduleName = context_12 && context_12.id;
    return {
        setters: [
            function (MemoryView_ts_4_1) {
                MemoryView_ts_4 = MemoryView_ts_4_1;
            }
        ],
        execute: function () {
            EEPROMSavedata = class EEPROMSavedata extends MemoryView_ts_4.default {
                constructor(size) {
                    super(new ArrayBuffer(size));
                    this.writePending = false;
                    this.dma = null;
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
                    // this.mmu = mmu;    
                    // this.dma = (mmu.cpu.irq as IIRQ).dma[3];
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
                    if (!this.dma) {
                        throw new Error("dma is null");
                    }
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
                            if (!this.dma) {
                                throw new Error("dma is null");
                            }
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
            exports_12("default", EEPROMSavedata);
        }
    };
});
System.register("savedata/FlashSavedata", ["mmu/MemoryView"], function (exports_13, context_13) {
    "use strict";
    var MemoryView_ts_5, FlashSavedata;
    var __moduleName = context_13 && context_13.id;
    return {
        setters: [
            function (MemoryView_ts_5_1) {
                MemoryView_ts_5 = MemoryView_ts_5_1;
            }
        ],
        execute: function () {
            FlashSavedata = /** @class */ (() => {
                class FlashSavedata extends MemoryView_ts_5.default {
                    constructor(size) {
                        super(new ArrayBuffer(size), 0);
                        this.writePending = false;
                        this.idMode = false;
                        this.first = 0;
                        this.second = 0;
                        this.command = 0;
                        this.pendingCommand = 0;
                        this.dma = null;
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
            exports_13("default", FlashSavedata);
        }
    };
});
System.register("savedata/SRAMSavedata", ["mmu/MemoryView"], function (exports_14, context_14) {
    "use strict";
    var MemoryView_ts_6, SRAMSavedata;
    var __moduleName = context_14 && context_14.id;
    return {
        setters: [
            function (MemoryView_ts_6_1) {
                MemoryView_ts_6 = MemoryView_ts_6_1;
            }
        ],
        execute: function () {
            SRAMSavedata = class SRAMSavedata extends MemoryView_ts_6.default {
                constructor(size) {
                    super(new ArrayBuffer(size));
                    this.writePending = false;
                    this.dma = null;
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
            exports_14("default", SRAMSavedata);
        }
    };
});
// https://github.com/mgba-emu/mgba/blob/master/src/gba/savedata.c
// SRAM
// FLASH1M
// FLASH512
// EEPROM
// EEPROM512
System.register("savedata/mod", ["savedata/EEPROMSavedata", "savedata/FlashSavedata", "savedata/SRAMSavedata", "interfaces"], function (exports_15, context_15) {
    "use strict";
    var EEPROMSavedata_ts_1, FlashSavedata_ts_1, SRAMSavedata_ts_1, interfaces_ts_2;
    var __moduleName = context_15 && context_15.id;
    function factory(saveType) {
        switch (saveType) {
            case 'FLASH_V':
            case 'FLASH512_V':
                return {
                    region: interfaces_ts_2.MemoryRegion.CART_SRAM,
                    savedata: new FlashSavedata_ts_1.default(interfaces_ts_2.MemoryRegionSize.CART_FLASH512),
                    saveType
                };
            case 'FLASH1M_V':
                return {
                    region: interfaces_ts_2.MemoryRegion.CART_SRAM,
                    savedata: new FlashSavedata_ts_1.default(interfaces_ts_2.MemoryRegionSize.CART_FLASH1M),
                    saveType
                };
            case 'SRAM_V':
                return {
                    region: interfaces_ts_2.MemoryRegion.CART_SRAM,
                    savedata: new SRAMSavedata_ts_1.default(interfaces_ts_2.MemoryRegionSize.CART_SRAM),
                    saveType
                };
            case 'EEPROM_V':
                return {
                    region: interfaces_ts_2.MemoryRegion.CART2 + 1,
                    savedata: new EEPROMSavedata_ts_1.default(interfaces_ts_2.MemoryRegionSize.CART_EEPROM),
                    saveType
                };
        }
        return {
            region: interfaces_ts_2.MemoryRegion.CART_SRAM,
            savedata: new SRAMSavedata_ts_1.default(interfaces_ts_2.MemoryRegionSize.CART_SRAM),
            saveType: 'SRAM_V'
        };
    }
    exports_15("factory", factory);
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
            },
            function (interfaces_ts_2_1) {
                interfaces_ts_2 = interfaces_ts_2_1;
            }
        ],
        execute: function () {
            exports_15("EEPROMSavedata", EEPROMSavedata_ts_1.default);
            exports_15("FlashSavedata", FlashSavedata_ts_1.default);
            exports_15("SRAMSavedata", SRAMSavedata_ts_1.default);
        }
    };
});
System.register("mmu/GameBoyAdvanceMMU", ["mmu/BIOSView", "mmu/MemoryBlock", "mmu/BadMemory", "mmu/ROMView", "gpio/mod", "interfaces", "savedata/mod", "utils"], function (exports_16, context_16) {
    "use strict";
    var BIOSView_ts_1, MemoryBlock_ts_1, BadMemory_ts_1, ROMView_ts_1, mod_ts_1, interfaces_ts_3, mod_ts_2, utils_ts_2, GameBoyAdvanceMMU;
    var __moduleName = context_16 && context_16.id;
    return {
        setters: [
            function (BIOSView_ts_1_1) {
                BIOSView_ts_1 = BIOSView_ts_1_1;
            },
            function (MemoryBlock_ts_1_1) {
                MemoryBlock_ts_1 = MemoryBlock_ts_1_1;
            },
            function (BadMemory_ts_1_1) {
                BadMemory_ts_1 = BadMemory_ts_1_1;
            },
            function (ROMView_ts_1_1) {
                ROMView_ts_1 = ROMView_ts_1_1;
            },
            function (mod_ts_1_1) {
                mod_ts_1 = mod_ts_1_1;
            },
            function (interfaces_ts_3_1) {
                interfaces_ts_3 = interfaces_ts_3_1;
            },
            function (mod_ts_2_1) {
                mod_ts_2 = mod_ts_2_1;
            },
            function (utils_ts_2_1) {
                utils_ts_2 = utils_ts_2_1;
            }
        ],
        execute: function () {
            GameBoyAdvanceMMU = class GameBoyAdvanceMMU {
                constructor() {
                    this.REGION_BIOS = 0x0;
                    this.REGION_WORKING_RAM = 0x2;
                    this.REGION_WORKING_IRAM = 0x3;
                    this.REGION_IO = 0x4;
                    this.REGION_PALETTE_RAM = 0x5;
                    this.REGION_VRAM = 0x6;
                    this.REGION_OAM = 0x7;
                    this.REGION_CART0 = 0x8;
                    this.REGION_CART1 = 0xA;
                    this.REGION_CART2 = 0xC;
                    this.REGION_CART_SRAM = 0xE;
                    this.BASE_BIOS = 0x00000000;
                    this.BASE_WORKING_RAM = 0x02000000;
                    this.BASE_WORKING_IRAM = 0x03000000;
                    this.BASE_IO = 0x04000000;
                    this.BASE_PALETTE_RAM = 0x05000000;
                    this.BASE_VRAM = 0x06000000;
                    this.BASE_OAM = 0x07000000;
                    this.BASE_CART0 = 0x08000000;
                    this.BASE_CART1 = 0x0A000000;
                    this.BASE_CART2 = 0x0C000000;
                    this.BASE_CART_SRAM = 0x0E000000;
                    this.BASE_MASK = 0x0F000000;
                    this.BASE_OFFSET = 24;
                    this.OFFSET_MASK = 0x00FFFFFF;
                    this.SIZE_BIOS = 0x00004000;
                    this.SIZE_WORKING_RAM = 0x00040000;
                    this.SIZE_WORKING_IRAM = 0x00008000;
                    this.SIZE_IO = 0x00000400;
                    this.SIZE_PALETTE_RAM = 0x00000400;
                    this.SIZE_VRAM = 0x00018000;
                    this.SIZE_OAM = 0x00000400;
                    this.SIZE_CART0 = 0x02000000;
                    this.SIZE_CART1 = 0x02000000;
                    this.SIZE_CART2 = 0x02000000;
                    this.SIZE_CART_SRAM = 0x00008000;
                    this.SIZE_CART_FLASH512 = 0x00010000;
                    this.SIZE_CART_FLASH1M = 0x00020000;
                    this.SIZE_CART_EEPROM = 0x00002000;
                    this.DMA_TIMING_NOW = 0;
                    this.DMA_TIMING_VBLANK = 1;
                    this.DMA_TIMING_HBLANK = 2;
                    this.DMA_TIMING_CUSTOM = 3;
                    this.DMA_INCREMENT = 0;
                    this.DMA_DECREMENT = 1;
                    this.DMA_FIXED = 2;
                    this.DMA_INCREMENT_RELOAD = 3;
                    this.DMA_OFFSET = [1, -1, 0, 1];
                    this.ROM_WS = [4, 3, 2, 8];
                    this.ROM_WS_SEQ = [
                        [2, 1],
                        [4, 1],
                        [8, 1]
                    ];
                    this.ICACHE_PAGE_BITS = 8;
                    this.WAITSTATES = [0, 0, 2, 0, 0, 0, 0, 0, 4, 4, 4, 4, 4, 4, 4];
                    this.WAITSTATES_32 = [0, 0, 5, 0, 0, 1, 0, 1, 7, 7, 9, 9, 13, 13, 8];
                    this.WAITSTATES_SEQ = [0, 0, 2, 0, 0, 0, 0, 0, 2, 2, 4, 4, 8, 8, 4];
                    this.WAITSTATES_SEQ_32 = [0, 0, 5, 0, 0, 1, 0, 1, 5, 5, 9, 9, 17, 17, 8];
                    this.NULLWAIT = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                    this.waitstates = [];
                    this.waitstatesSeq = [];
                    this.waitstates32 = [];
                    this.waitstatesSeq32 = [];
                    this.waitstatesPrefetch = [];
                    this.waitstatesPrefetch32 = [];
                    this.badMemory = null;
                    this.save = null;
                    this.memory = [];
                    this.cart = null;
                    for (let i = 15; i < 256; ++i) {
                        this.WAITSTATES[i] = 0;
                        this.WAITSTATES_32[i] = 0;
                        this.WAITSTATES_SEQ[i] = 0;
                        this.WAITSTATES_SEQ_32[i] = 0;
                        this.NULLWAIT[i] = 0;
                    }
                    this.PAGE_MASK = (2 << this.ICACHE_PAGE_BITS) - 1;
                }
                /**
                 *
                 * @param region
                 * @param object
                 */
                mmap(region, object) {
                    this.memory[region] = object;
                }
                getILog() {
                    return this.core;
                }
                /**
                 * 清除記憶體
                 */
                clear() {
                    this.badMemory = new BadMemory_ts_1.default(this, this.cpu);
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
                        this.bios,
                        this.badMemory,
                        new MemoryBlock_ts_1.default(interfaces_ts_3.MemoryRegionSize.WORKING_RAM, 9),
                        new MemoryBlock_ts_1.default(interfaces_ts_3.MemoryRegionSize.WORKING_IRAM, 7),
                        null,
                        null,
                        null,
                        null,
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
                    const context = this.core;
                    this.DMA_REGISTER = [
                        context.io.DMA0CNT_HI >> 1,
                        context.io.DMA1CNT_HI >> 1,
                        context.io.DMA2CNT_HI >> 1,
                        context.io.DMA3CNT_HI >> 1
                    ];
                }
                freeze() {
                    return {
                        'ram': utils_ts_2.Serializer.prefix(this.getWorkingRam().buffer),
                        'iram': utils_ts_2.Serializer.prefix(this.getWorkingIRam().buffer),
                    };
                }
                getWorkingRam() {
                    return this.memory[interfaces_ts_3.MemoryRegion.WORKING_RAM];
                }
                getWorkingIRam() {
                    return this.memory[interfaces_ts_3.MemoryRegion.WORKING_IRAM];
                }
                defrost(frost) {
                    this.getWorkingRam().replaceData(frost.ram, 0);
                    this.getWorkingIRam().replaceData(frost.iram, 0);
                }
                /**
                 * 載入 BIOS
                 * @param bios
                 * @param real
                 */
                loadBios(bios, real = false) {
                    this.bios = new BIOSView_ts_1.default(bios);
                    this.bios.real = real;
                }
                /**
                 * 載入遊戲
                 * @param rom 遊戲 ROM
                 * @param process
                 */
                loadRom(rom, process) {
                    const lo = new ROMView_ts_1.default(rom);
                    if (lo.view.getUint8(0xB2) != 0x96) {
                        // Not a valid ROM
                        return null;
                    }
                    lo.setMMU(this); // Needed for GPIO        
                    this.memory[interfaces_ts_3.MemoryRegion.CART0] = lo;
                    this.memory[interfaces_ts_3.MemoryRegion.CART1] = lo;
                    this.memory[interfaces_ts_3.MemoryRegion.CART2] = lo;
                    if (rom.byteLength > 0x01000000) {
                        const hi = new ROMView_ts_1.default(rom, 0x01000000);
                        this.memory[interfaces_ts_3.MemoryRegion.CART0 + 1] = hi;
                        this.memory[interfaces_ts_3.MemoryRegion.CART1 + 1] = hi;
                        this.memory[interfaces_ts_3.MemoryRegion.CART2 + 1] = hi;
                    }
                    let cart = {
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
                        const saveType = this.findSaveType(rom);
                        // if(saveType){                
                        // try{
                        const result = mod_ts_2.factory(saveType || '');
                        this.save = result.savedata;
                        this.memory[result.region] = result.savedata;
                        this.save.dma = this.cpu.irq.dma[3];
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
                findTitle(rom) {
                    const content = new Uint8Array(rom);
                    return String.fromCharCode(...content.slice(0xa0, 0xa0 + 12));
                }
                findCode(rom) {
                    const content = new Uint8Array(rom);
                    return String.fromCharCode(...content.slice(0xac, 0xac + 4));
                }
                findMaker(rom) {
                    const content = new Uint8Array(rom);
                    return String.fromCharCode(...content.slice(0xb0, 0xb0 + 2));
                }
                /**
                 * 存檔格式類型
                 * @param rom
                 */
                findSaveType(rom) {
                    let state = '';
                    let next;
                    const pattern1 = ['F',
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
                    const pattern2 = [
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
                loadSavedata(save) {
                    if (!this.save) {
                        throw new Error("save is null");
                    }
                    this.save.replaceData(save, 0);
                }
                ;
                getMemoryView(offset) {
                    return this.memory[offset >>> this.BASE_OFFSET];
                }
                load8(offset) {
                    return this.getMemoryView(offset).load8(offset & 0x00FFFFFF);
                }
                load16(offset) {
                    return this.getMemoryView(offset).load16(offset & 0x00FFFFFF);
                }
                load32(offset) {
                    return this.getMemoryView(offset).load32(offset & 0x00FFFFFF);
                }
                loadU8(offset) {
                    return this.getMemoryView(offset).loadU8(offset & 0x00FFFFFF);
                }
                loadU16(offset) {
                    return this.getMemoryView(offset).loadU16(offset & 0x00FFFFFF);
                }
                /**
                 *
                 * @param offset
                 * @param value
                 */
                store8(offset, value) {
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
                store16(offset, value) {
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
                store32(offset, value) {
                    const maskedOffset = offset & 0x00FFFFFC;
                    const memory = this.getMemoryView(offset);
                    memory.store32(maskedOffset, value);
                    memory.invalidatePage(maskedOffset);
                    memory.invalidatePage(maskedOffset + 2);
                }
                getCPU() {
                    if (!this.cpu) {
                        throw new Error("cpu is null");
                    }
                    return this.cpu;
                }
                /**
                 *
                 * @param memory
                 */
                waitPrefetch(memory) {
                    this.getCPU().cycles += 1 + this.waitstatesPrefetch[memory >>> this.BASE_OFFSET];
                }
                /**
                 *
                 * @param memory
                 */
                waitPrefetch32(memory) {
                    this.getCPU().cycles += 1 + this.waitstatesPrefetch32[memory >>> this.BASE_OFFSET];
                }
                /**
                 *
                 * @param memory
                 */
                wait(memory) {
                    this.getCPU().cycles += 1 + this.waitstates[memory >>> this.BASE_OFFSET];
                }
                /**
                 *
                 * @param memory
                 */
                wait32(memory) {
                    this.getCPU().cycles += 1 + this.waitstates32[memory >>> this.BASE_OFFSET];
                }
                /**
                 *
                 * @param memory
                 */
                waitSeq(memory) {
                    this.getCPU().cycles += 1 + this.waitstatesSeq[memory >>> this.BASE_OFFSET];
                }
                /**
                 *
                 * @param memory
                 */
                waitSeq32(memory) {
                    this.getCPU().cycles += 1 + this.waitstatesSeq32[memory >>> this.BASE_OFFSET];
                }
                /**
                 *
                 * @param rs
                 */
                waitMul(rs) {
                    const cpu = this.getCPU();
                    if (((rs & 0xFFFFFF00) == 0xFFFFFF00) || !(rs & 0xFFFFFF00)) {
                        cpu.cycles += 1;
                    }
                    else if (((rs & 0xFFFF0000) == 0xFFFF0000) || !(rs & 0xFFFF0000)) {
                        cpu.cycles += 2;
                    }
                    else if (((rs & 0xFF000000) == 0xFF000000) || !(rs & 0xFF000000)) {
                        cpu.cycles += 3;
                    }
                    else {
                        cpu.cycles += 4;
                    }
                }
                /**
                 *
                 * @param memory
                 * @param seq
                 */
                waitMulti32(memory, seq) {
                    const cpu = this.getCPU();
                    cpu.cycles += 1 + this.waitstates32[memory >>> this.BASE_OFFSET];
                    cpu.cycles += (1 + this.waitstatesSeq32[memory >>> this.BASE_OFFSET]) * (seq - 1);
                }
                addressToPage(region, address) {
                    if (!this.memory[region]) {
                        throw new Error("memory is invalid");
                    }
                    const memory = this.memory[region];
                    return address >> memory.ICACHE_PAGE_BITS;
                }
                /**
                 *
                 * @param region
                 * @param pageId
                 */
                accessPage(region, pageId) {
                    const memory = this.memory[region];
                    if (!memory.icache) {
                        throw new Error("no init icache");
                    }
                    const bios = this.memory[region];
                    let page = memory.icache[pageId];
                    if (!page || page.invalid) {
                        page = {
                            thumb: new Array(1 << (bios.ICACHE_PAGE_BITS)),
                            arm: new Array(1 << bios.ICACHE_PAGE_BITS - 1),
                            invalid: false
                        };
                        memory.icache[pageId] = page;
                    }
                    return page;
                }
                scheduleDma(number, info) {
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
                                    this.core.WARN('Discarding invalid DMA0 scheduling');
                                    break;
                                case 1:
                                case 2:
                                    this.getIRQ().audio.scheduleFIFODma(number, info);
                                    break;
                                // case 3:
                                // this.getIRQ().video.scheduleVCaptureDma(dma, info);
                                // break;
                            }
                    }
                }
                getIRQ() {
                    const irq = this.getCPU().irq;
                    return irq;
                }
                /**
                 *
                 */
                runHblankDmas() {
                    const irq = this.getIRQ();
                    for (let i = 0; i < irq.dma.length; ++i) {
                        const dma = irq.dma[i];
                        if (dma.enable && dma.timing == this.DMA_TIMING_HBLANK) {
                            this.serviceDma(i, dma);
                        }
                    }
                }
                /**
                 *
                 */
                runVblankDmas() {
                    const irq = this.getIRQ();
                    for (let i = 0; i < irq.dma.length; ++i) {
                        const dma = irq.dma[i];
                        if (dma.enable && dma.timing == this.DMA_TIMING_VBLANK) {
                            this.serviceDma(i, dma);
                        }
                    }
                }
                /**
                 *
                 * @param number
                 * @param info
                 */
                serviceDma(number, info) {
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
                    const sourceBlockMem = this.memory[sourceRegion];
                    const destBlock = this.memory[destRegion];
                    const destBlockMem = this.memory[destRegion];
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
                    if (destRegion == interfaces_ts_3.MemoryRegion.WORKING_RAM || destRegion == interfaces_ts_3.MemoryRegion.WORKING_IRAM) {
                        destView = destBlockMem.view;
                        destMask = destBlockMem.mask;
                    }
                    if (sourceRegion == interfaces_ts_3.MemoryRegion.WORKING_RAM || sourceRegion == interfaces_ts_3.MemoryRegion.WORKING_IRAM || sourceRegion == interfaces_ts_3.MemoryRegion.CART0 || sourceRegion == interfaces_ts_3.MemoryRegion.CART1) {
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
                            }
                            else {
                                while (wordsRemaining--) {
                                    word = sourceView.getUint16(source & sourceMask);
                                    destView.setUint16(dest & destMask, word);
                                    source += sourceOffset;
                                    dest += destOffset;
                                }
                            }
                        }
                        else if (sourceView) {
                            if (width == 4) {
                                source &= 0xFFFFFFFC;
                                dest &= 0xFFFFFFFC;
                                while (wordsRemaining--) {
                                    word = sourceView.getInt32(source & sourceMask, true);
                                    destBlockMem.store32(dest, word);
                                    source += sourceOffset;
                                    dest += destOffset;
                                }
                            }
                            else {
                                while (wordsRemaining--) {
                                    word = sourceView.getUint16(source & sourceMask, true);
                                    destBlockMem.store16(dest, word);
                                    source += sourceOffset;
                                    dest += destOffset;
                                }
                            }
                        }
                        else {
                            if (width == 4) {
                                source &= 0xFFFFFFFC;
                                dest &= 0xFFFFFFFC;
                                while (wordsRemaining--) {
                                    word = sourceBlockMem.load32(source);
                                    destBlockMem.store32(dest, word);
                                    source += sourceOffset;
                                    dest += destOffset;
                                }
                            }
                            else {
                                while (wordsRemaining--) {
                                    word = sourceBlockMem.loadU16(source);
                                    destBlockMem.store16(dest, word);
                                    source += sourceOffset;
                                    dest += destOffset;
                                }
                            }
                        }
                    }
                    else {
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
                        const io = this.getIIO();
                        if (!this.DMA_REGISTER) {
                            throw new Error("dma register invalid");
                        }
                        const dmaReg = this.DMA_REGISTER[number];
                        io.registers[dmaReg] &= 0x7FE0;
                    }
                    else {
                        info.nextCount = info.count;
                        if (info.dstControl == this.DMA_INCREMENT_RELOAD) {
                            info.nextDest = info.dest;
                        }
                        this.scheduleDma(number, info);
                    }
                }
                getIIO() {
                    return this.memory[interfaces_ts_3.MemoryRegion.IO];
                }
                /**
                 *
                 * @param word
                 */
                adjustTimings(word) {
                    var sram = word & 0x0003;
                    var ws0 = (word & 0x000C) >> 2;
                    var ws0seq = (word & 0x0010) >> 4;
                    var ws1 = (word & 0x0060) >> 5;
                    var ws1seq = (word & 0x0080) >> 7;
                    var ws2 = (word & 0x0300) >> 8;
                    var ws2seq = (word & 0x0400) >> 10;
                    var prefetch = word & 0x4000;
                    this.waitstates[interfaces_ts_3.MemoryRegion.CART_SRAM] = this.ROM_WS[sram];
                    this.waitstatesSeq[interfaces_ts_3.MemoryRegion.CART_SRAM] = this.ROM_WS[sram];
                    this.waitstates32[interfaces_ts_3.MemoryRegion.CART_SRAM] = this.ROM_WS[sram];
                    this.waitstatesSeq32[interfaces_ts_3.MemoryRegion.CART_SRAM] = this.ROM_WS[sram];
                    this.waitstates[interfaces_ts_3.MemoryRegion.CART0] = this.waitstates[interfaces_ts_3.MemoryRegion.CART0 + 1] = this.ROM_WS[ws0];
                    this.waitstates[interfaces_ts_3.MemoryRegion.CART1] = this.waitstates[interfaces_ts_3.MemoryRegion.CART1 + 1] = this.ROM_WS[ws1];
                    this.waitstates[interfaces_ts_3.MemoryRegion.CART2] = this.waitstates[interfaces_ts_3.MemoryRegion.CART2 + 1] = this.ROM_WS[ws2];
                    this.waitstatesSeq[interfaces_ts_3.MemoryRegion.CART0] = this.waitstatesSeq[interfaces_ts_3.MemoryRegion.CART0 + 1] = this.ROM_WS_SEQ[0][ws0seq];
                    this.waitstatesSeq[interfaces_ts_3.MemoryRegion.CART1] = this.waitstatesSeq[interfaces_ts_3.MemoryRegion.CART1 + 1] = this.ROM_WS_SEQ[1][ws1seq];
                    this.waitstatesSeq[interfaces_ts_3.MemoryRegion.CART2] = this.waitstatesSeq[interfaces_ts_3.MemoryRegion.CART2 + 1] = this.ROM_WS_SEQ[2][ws2seq];
                    this.waitstates32[interfaces_ts_3.MemoryRegion.CART0] = this.waitstates32[interfaces_ts_3.MemoryRegion.CART0 + 1] = this.waitstates[interfaces_ts_3.MemoryRegion.CART0] + 1 + this.waitstatesSeq[interfaces_ts_3.MemoryRegion.CART0];
                    this.waitstates32[interfaces_ts_3.MemoryRegion.CART1] = this.waitstates32[interfaces_ts_3.MemoryRegion.CART1 + 1] = this.waitstates[interfaces_ts_3.MemoryRegion.CART1] + 1 + this.waitstatesSeq[interfaces_ts_3.MemoryRegion.CART1];
                    this.waitstates32[interfaces_ts_3.MemoryRegion.CART2] = this.waitstates32[interfaces_ts_3.MemoryRegion.CART2 + 1] = this.waitstates[interfaces_ts_3.MemoryRegion.CART2] + 1 + this.waitstatesSeq[interfaces_ts_3.MemoryRegion.CART2];
                    this.waitstatesSeq32[interfaces_ts_3.MemoryRegion.CART0] = this.waitstatesSeq32[interfaces_ts_3.MemoryRegion.CART0 + 1] = 2 * this.waitstatesSeq[interfaces_ts_3.MemoryRegion.CART0] + 1;
                    this.waitstatesSeq32[interfaces_ts_3.MemoryRegion.CART1] = this.waitstatesSeq32[interfaces_ts_3.MemoryRegion.CART1 + 1] = 2 * this.waitstatesSeq[interfaces_ts_3.MemoryRegion.CART1] + 1;
                    this.waitstatesSeq32[interfaces_ts_3.MemoryRegion.CART2] = this.waitstatesSeq32[interfaces_ts_3.MemoryRegion.CART2 + 1] = 2 * this.waitstatesSeq[interfaces_ts_3.MemoryRegion.CART2] + 1;
                    if (prefetch) {
                        this.waitstatesPrefetch[interfaces_ts_3.MemoryRegion.CART0] = this.waitstatesPrefetch[interfaces_ts_3.MemoryRegion.CART0 + 1] = 0;
                        this.waitstatesPrefetch[interfaces_ts_3.MemoryRegion.CART1] = this.waitstatesPrefetch[interfaces_ts_3.MemoryRegion.CART1 + 1] = 0;
                        this.waitstatesPrefetch[interfaces_ts_3.MemoryRegion.CART2] = this.waitstatesPrefetch[interfaces_ts_3.MemoryRegion.CART2 + 1] = 0;
                        this.waitstatesPrefetch32[interfaces_ts_3.MemoryRegion.CART0] = this.waitstatesPrefetch32[interfaces_ts_3.MemoryRegion.CART0 + 1] = 0;
                        this.waitstatesPrefetch32[interfaces_ts_3.MemoryRegion.CART1] = this.waitstatesPrefetch32[interfaces_ts_3.MemoryRegion.CART1 + 1] = 0;
                        this.waitstatesPrefetch32[interfaces_ts_3.MemoryRegion.CART2] = this.waitstatesPrefetch32[interfaces_ts_3.MemoryRegion.CART2 + 1] = 0;
                    }
                    else {
                        this.waitstatesPrefetch[interfaces_ts_3.MemoryRegion.CART0] = this.waitstatesPrefetch[interfaces_ts_3.MemoryRegion.CART0 + 1] = this.waitstatesSeq[interfaces_ts_3.MemoryRegion.CART0];
                        this.waitstatesPrefetch[interfaces_ts_3.MemoryRegion.CART1] = this.waitstatesPrefetch[interfaces_ts_3.MemoryRegion.CART1 + 1] = this.waitstatesSeq[interfaces_ts_3.MemoryRegion.CART1];
                        this.waitstatesPrefetch[interfaces_ts_3.MemoryRegion.CART2] = this.waitstatesPrefetch[interfaces_ts_3.MemoryRegion.CART2 + 1] = this.waitstatesSeq[interfaces_ts_3.MemoryRegion.CART2];
                        this.waitstatesPrefetch32[interfaces_ts_3.MemoryRegion.CART0] = this.waitstatesPrefetch32[interfaces_ts_3.MemoryRegion.CART0 + 1] = this.waitstatesSeq32[interfaces_ts_3.MemoryRegion.CART0];
                        this.waitstatesPrefetch32[interfaces_ts_3.MemoryRegion.CART1] = this.waitstatesPrefetch32[interfaces_ts_3.MemoryRegion.CART1 + 1] = this.waitstatesSeq32[interfaces_ts_3.MemoryRegion.CART1];
                        this.waitstatesPrefetch32[interfaces_ts_3.MemoryRegion.CART2] = this.waitstatesPrefetch32[interfaces_ts_3.MemoryRegion.CART2 + 1] = this.waitstatesSeq32[interfaces_ts_3.MemoryRegion.CART2];
                    }
                }
                getISave() {
                    if (!this.save) {
                        throw new Error("save is null");
                    }
                    return this.save;
                }
                /**
                 *
                 */
                saveNeedsFlush() {
                    return this.getISave().writePending;
                }
                /**
                 *
                 */
                flushSave() {
                    this.getISave().writePending = false;
                }
                allocGPIO(rom) {
                    return new mod_ts_1.GameBoyAdvanceGPIO(this.core, rom);
                }
            };
            exports_16("default", GameBoyAdvanceMMU);
        }
    };
});
System.register("mmu/mod", ["mmu/MemoryBlock", "mmu/GameBoyAdvanceMMU"], function (exports_17, context_17) {
    "use strict";
    var MemoryBlock_ts_2, GameBoyAdvanceMMU_ts_1;
    var __moduleName = context_17 && context_17.id;
    return {
        setters: [
            function (MemoryBlock_ts_2_1) {
                MemoryBlock_ts_2 = MemoryBlock_ts_2_1;
            },
            function (GameBoyAdvanceMMU_ts_1_1) {
                GameBoyAdvanceMMU_ts_1 = GameBoyAdvanceMMU_ts_1_1;
            }
        ],
        execute: function () {
            exports_17("MemoryBlock", MemoryBlock_ts_2.default);
            exports_17("GameBoyAdvanceMMU", GameBoyAdvanceMMU_ts_1.default);
        }
    };
});

const __exp = __instantiate("mmu/mod", false);
export const MemoryBlock = __exp["MemoryBlock"];
export const GameBoyAdvanceMMU = __exp["GameBoyAdvanceMMU"];
