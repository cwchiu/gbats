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
    var MemoryRegion, MemoryRegionSize, ARMMode, ARMBank, OpExecMode, LogLevel, IRQType, IRQMask;
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
            (function (IRQType) {
                IRQType[IRQType["VBLANK"] = 0] = "VBLANK";
                IRQType[IRQType["HBLANK"] = 1] = "HBLANK";
                IRQType[IRQType["VCOUNTER"] = 2] = "VCOUNTER";
                IRQType[IRQType["TIMER0"] = 3] = "TIMER0";
                IRQType[IRQType["TIMER1"] = 4] = "TIMER1";
                IRQType[IRQType["TIMER2"] = 5] = "TIMER2";
                IRQType[IRQType["TIMER3"] = 6] = "TIMER3";
                IRQType[IRQType["SIO"] = 7] = "SIO";
                IRQType[IRQType["DMA0"] = 8] = "DMA0";
                IRQType[IRQType["DMA1"] = 9] = "DMA1";
                IRQType[IRQType["DMA2"] = 10] = "DMA2";
                IRQType[IRQType["DMA3"] = 11] = "DMA3";
                IRQType[IRQType["KEYPAD"] = 12] = "KEYPAD";
                IRQType[IRQType["GAMEPAK"] = 13] = "GAMEPAK";
            })(IRQType || (IRQType = {}));
            exports_1("IRQType", IRQType);
            (function (IRQMask) {
                IRQMask[IRQMask["VBLANK"] = 1] = "VBLANK";
                IRQMask[IRQMask["HBLANK"] = 2] = "HBLANK";
                IRQMask[IRQMask["VCOUNTER"] = 4] = "VCOUNTER";
                IRQMask[IRQMask["TIMER0"] = 8] = "TIMER0";
                IRQMask[IRQMask["TIMER1"] = 16] = "TIMER1";
                IRQMask[IRQMask["TIMER2"] = 32] = "TIMER2";
                IRQMask[IRQMask["TIMER3"] = 64] = "TIMER3";
                IRQMask[IRQMask["SIO"] = 128] = "SIO";
                IRQMask[IRQMask["DMA0"] = 256] = "DMA0";
                IRQMask[IRQMask["DMA1"] = 512] = "DMA1";
                IRQMask[IRQMask["DMA2"] = 1024] = "DMA2";
                IRQMask[IRQMask["DMA3"] = 2048] = "DMA3";
                IRQMask[IRQMask["KEYPAD"] = 4096] = "KEYPAD";
                IRQMask[IRQMask["GAMEPAK"] = 8192] = "GAMEPAK";
            })(IRQMask || (IRQMask = {}));
            exports_1("IRQMask", IRQMask);
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
System.register("irq/GameBoyAdvanceInterruptHandler", ["interfaces", "mmu/MemoryBlock"], function (exports_4, context_4) {
    "use strict";
    var interfaces_ts_1, MemoryBlock_ts_1, GameBoyAdvanceInterruptHandler;
    var __moduleName = context_4 && context_4.id;
    return {
        setters: [
            function (interfaces_ts_1_1) {
                interfaces_ts_1 = interfaces_ts_1_1;
            },
            function (MemoryBlock_ts_1_1) {
                MemoryBlock_ts_1 = MemoryBlock_ts_1_1;
            }
        ],
        execute: function () {
            GameBoyAdvanceInterruptHandler = class GameBoyAdvanceInterruptHandler {
                constructor() {
                    this.FREQUENCY = 0x1000000;
                    this.enable = false;
                    this.IRQ_VBLANK = 0x0;
                    this.IRQ_HBLANK = 0x1;
                    this.IRQ_VCOUNTER = 0x2;
                    this.IRQ_TIMER0 = 0x3;
                    this.IRQ_TIMER1 = 0x4;
                    this.IRQ_TIMER2 = 0x5;
                    this.IRQ_TIMER3 = 0x6;
                    this.IRQ_SIO = 0x7;
                    this.IRQ_DMA0 = 0x8;
                    this.IRQ_DMA1 = 0x9;
                    this.IRQ_DMA2 = 0xA;
                    this.IRQ_DMA3 = 0xB;
                    this.IRQ_KEYPAD = 0xC;
                    this.IRQ_GAMEPAK = 0xD;
                    this.MASK_VBLANK = 0x0001;
                    this.MASK_HBLANK = 0x0002;
                    this.MASK_VCOUNTER = 0x0004;
                    this.MASK_TIMER0 = 0x0008;
                    this.MASK_TIMER1 = 0x0010;
                    this.MASK_TIMER2 = 0x0020;
                    this.MASK_TIMER3 = 0x0040;
                    this.MASK_SIO = 0x0080;
                    this.MASK_DMA0 = 0x0100;
                    this.MASK_DMA1 = 0x0200;
                    this.MASK_DMA2 = 0x0400;
                    this.MASK_DMA3 = 0x0800;
                    this.MASK_KEYPAD = 0x1000;
                    this.MASK_GAMEPAK = 0x2000;
                    this.enabledIRQs = false;
                    this.interruptFlags = 0;
                    this.timersEnabled = 0;
                    this.nextEvent = 0;
                    this.springIRQ = false;
                    this.dma = [];
                    this.timers = [];
                    this.cpu = null;
                    this.video = null;
                    this.audio = null;
                    this.io = null;
                    this.core = null;
                }
                /**
                 *
                 */
                clear() {
                    this.enable = false;
                    this.enabledIRQs = false;
                    this.interruptFlags = 0;
                    this.dma = [];
                    for (let i = 0; i < 4; ++i) {
                        this.dma.push({
                            source: 0,
                            dest: 0,
                            count: 0,
                            nextSource: 0,
                            nextDest: 0,
                            nextCount: 0,
                            srcControl: 0,
                            dstControl: 0,
                            repeat: false,
                            width: 0,
                            drq: false,
                            timing: 0,
                            doIrq: false,
                            enable: false,
                            nextIRQ: 0
                        });
                    }
                    this.timersEnabled = 0;
                    this.timers = new Array();
                    for (let i = 0; i < 4; ++i) {
                        this.timers.push({
                            reload: 0,
                            oldReload: 0,
                            prescaleBits: 0,
                            countUp: false,
                            doIrq: false,
                            enable: false,
                            lastEvent: 0,
                            nextEvent: 0,
                            overflowInterval: 1
                        });
                    }
                    this.nextEvent = 0;
                    this.springIRQ = false;
                    this.resetSP();
                }
                /**
                 *
                 */
                freeze() {
                    return {
                        'enable': this.enable,
                        'enabledIRQs': this.enabledIRQs,
                        'interruptFlags': this.interruptFlags,
                        'dma': this.dma,
                        'timers': this.timers,
                        'nextEvent': this.nextEvent,
                        'springIRQ': this.springIRQ
                    };
                }
                /**
                 *
                 * @param frost
                 */
                defrost(frost) {
                    this.enable = frost.enable;
                    this.enabledIRQs = frost.enabledIRQs;
                    this.interruptFlags = frost.interruptFlags;
                    this.dma = frost.dma;
                    this.timers = frost.timers;
                    this.timersEnabled = 0;
                    if (this.timers[0].enable) {
                        ++this.timersEnabled;
                    }
                    if (this.timers[1].enable) {
                        ++this.timersEnabled;
                    }
                    if (this.timers[2].enable) {
                        ++this.timersEnabled;
                    }
                    if (this.timers[3].enable) {
                        ++this.timersEnabled;
                    }
                    this.nextEvent = frost.nextEvent;
                    this.springIRQ = frost.springIRQ;
                }
                /**
                 *
                 */
                updateTimers() {
                    const cpu = this.getCPU();
                    if (this.nextEvent > cpu.cycles) {
                        return;
                    }
                    if (this.springIRQ) {
                        cpu.raiseIRQ();
                        this.springIRQ = false;
                    }
                    if (!this.video) {
                        throw new Error("video no init");
                    }
                    this.video.updateTimers(cpu);
                    if (!this.audio) {
                        throw new Error("audio no init");
                    }
                    this.audio.updateTimers();
                    if (!this.io) {
                        throw new Error("io no init");
                    }
                    if (this.timersEnabled) {
                        var timer = this.timers[0];
                        if (timer.enable) {
                            if (cpu.cycles >= timer.nextEvent) {
                                timer.lastEvent = timer.nextEvent;
                                timer.nextEvent += timer.overflowInterval;
                                this.io.registers[this.io.TM0CNT_LO >> 1] = timer.reload;
                                timer.oldReload = timer.reload;
                                if (timer.doIrq) {
                                    this.raiseIRQ(this.IRQ_TIMER0);
                                }
                                if (this.audio.enabled) {
                                    if (this.audio.enableChannelA && !this.audio.soundTimerA && this.audio.dmaA >= 0) {
                                        this.audio.sampleFifoA();
                                    }
                                    if (this.audio.enableChannelB && !this.audio.soundTimerB && this.audio.dmaB >= 0) {
                                        this.audio.sampleFifoB();
                                    }
                                }
                                timer = this.timers[1];
                                if (timer.countUp) {
                                    if (++this.io.registers[this.io.TM1CNT_LO >> 1] == 0x10000) {
                                        timer.nextEvent = cpu.cycles;
                                    }
                                }
                            }
                        }
                        timer = this.timers[1];
                        if (timer.enable) {
                            if (cpu.cycles >= timer.nextEvent) {
                                timer.lastEvent = timer.nextEvent;
                                timer.nextEvent += timer.overflowInterval;
                                if (!timer.countUp || this.io.registers[this.io.TM1CNT_LO >> 1] == 0x10000) {
                                    this.io.registers[this.io.TM1CNT_LO >> 1] = timer.reload;
                                }
                                timer.oldReload = timer.reload;
                                if (timer.doIrq) {
                                    this.raiseIRQ(this.IRQ_TIMER1);
                                }
                                if (timer.countUp) {
                                    timer.nextEvent = 0;
                                }
                                if (this.audio.enabled) {
                                    if (this.audio.enableChannelA && this.audio.soundTimerA && this.audio.dmaA >= 0) {
                                        this.audio.sampleFifoA();
                                    }
                                    if (this.audio.enableChannelB && this.audio.soundTimerB && this.audio.dmaB >= 0) {
                                        this.audio.sampleFifoB();
                                    }
                                }
                                timer = this.timers[2];
                                if (timer.countUp) {
                                    if (++this.io.registers[this.io.TM2CNT_LO >> 1] == 0x10000) {
                                        timer.nextEvent = cpu.cycles;
                                    }
                                }
                            }
                        }
                        timer = this.timers[2];
                        if (timer.enable) {
                            if (cpu.cycles >= timer.nextEvent) {
                                timer.lastEvent = timer.nextEvent;
                                timer.nextEvent += timer.overflowInterval;
                                if (!timer.countUp || this.io.registers[this.io.TM2CNT_LO >> 1] == 0x10000) {
                                    this.io.registers[this.io.TM2CNT_LO >> 1] = timer.reload;
                                }
                                timer.oldReload = timer.reload;
                                if (timer.doIrq) {
                                    this.raiseIRQ(this.IRQ_TIMER2);
                                }
                                if (timer.countUp) {
                                    timer.nextEvent = 0;
                                }
                                timer = this.timers[3];
                                if (timer.countUp) {
                                    if (++this.io.registers[this.io.TM3CNT_LO >> 1] == 0x10000) {
                                        timer.nextEvent = cpu.cycles;
                                    }
                                }
                            }
                        }
                        timer = this.timers[3];
                        if (timer.enable) {
                            if (cpu.cycles >= timer.nextEvent) {
                                timer.lastEvent = timer.nextEvent;
                                timer.nextEvent += timer.overflowInterval;
                                if (!timer.countUp || this.io.registers[this.io.TM3CNT_LO >> 1] == 0x10000) {
                                    this.io.registers[this.io.TM3CNT_LO >> 1] = timer.reload;
                                }
                                timer.oldReload = timer.reload;
                                if (timer.doIrq) {
                                    this.raiseIRQ(this.IRQ_TIMER3);
                                }
                                if (timer.countUp) {
                                    timer.nextEvent = 0;
                                }
                            }
                        }
                    }
                    let dma = this.dma[0];
                    if (dma.enable && dma.doIrq && dma.nextIRQ && cpu.cycles >= dma.nextIRQ) {
                        dma.nextIRQ = 0;
                        this.raiseIRQ(this.IRQ_DMA0);
                    }
                    dma = this.dma[1];
                    if (dma.enable && dma.doIrq && dma.nextIRQ && cpu.cycles >= dma.nextIRQ) {
                        dma.nextIRQ = 0;
                        this.raiseIRQ(this.IRQ_DMA1);
                    }
                    dma = this.dma[2];
                    if (dma.enable && dma.doIrq && dma.nextIRQ && cpu.cycles >= dma.nextIRQ) {
                        dma.nextIRQ = 0;
                        this.raiseIRQ(this.IRQ_DMA2);
                    }
                    dma = this.dma[3];
                    if (dma.enable && dma.doIrq && dma.nextIRQ && cpu.cycles >= dma.nextIRQ) {
                        dma.nextIRQ = 0;
                        this.raiseIRQ(this.IRQ_DMA3);
                    }
                    this.pollNextEvent();
                }
                /**
                 *
                 */
                resetSP() {
                    if (!this.cpu) {
                        throw new Error("cpu no init");
                    }
                    this.cpu.switchMode(interfaces_ts_1.ARMMode.SVC);
                    this.cpu.gprs[this.cpu.SP] = 0x3007FE0;
                    this.cpu.switchMode(interfaces_ts_1.ARMMode.IRQ);
                    this.cpu.gprs[this.cpu.SP] = 0x3007FA0;
                    this.cpu.switchMode(interfaces_ts_1.ARMMode.System);
                    this.cpu.gprs[this.cpu.SP] = 0x3007F00;
                }
                /**
                 *
                 * @param opcode
                 */
                swi32(opcode) {
                    this.swi(opcode >> 16);
                }
                getGBA() {
                    return this.core;
                }
                getGBAMMU() {
                    return this.getGBA().mmu;
                }
                getBIOS() {
                    return this.getGBAMMU().bios;
                }
                getCPU() {
                    if (!this.cpu) {
                        throw new Error("cpu no init");
                    }
                    return this.cpu;
                }
                /**
                 *
                 * @param opcode
                 */
                swi(opcode) {
                    const cpu = this.getCPU();
                    if (this.getBIOS().real) {
                        cpu.raiseTrap();
                        return;
                    }
                    const mmu = this.getGBAMMU();
                    switch (opcode) {
                        case 0x00:
                            // SoftReset            
                            const mem = mmu.memory[interfaces_ts_1.MemoryRegion.WORKING_IRAM];
                            const flag = mem.loadU8(0x7FFA);
                            for (let i = 0x7E00; i < 0x8000; i += 4) {
                                mem.store32(i, 0);
                            }
                            this.resetSP();
                            if (!flag) {
                                cpu.gprs[cpu.LR] = 0x08000000;
                            }
                            else {
                                cpu.gprs[cpu.LR] = 0x02000000;
                            }
                            cpu.switchExecMode(interfaces_ts_1.OpExecMode.ARM);
                            if (!cpu.instruction) {
                                throw new Error("instruction no init");
                            }
                            cpu.instruction.writesPC = true;
                            cpu.gprs[cpu.PC] = cpu.gprs[cpu.LR];
                            break;
                        case 0x01:
                            // RegisterRamReset            
                            const regions = cpu.gprs[0];
                            if (regions & 0x01) {
                                mmu.memory[interfaces_ts_1.MemoryRegion.WORKING_RAM] = new MemoryBlock_ts_1.default(interfaces_ts_1.MemoryRegionSize.WORKING_RAM, 9);
                            }
                            if (regions & 0x02) {
                                const iram = mmu.memory[interfaces_ts_1.MemoryRegion.WORKING_IRAM];
                                for (var i = 0; i < interfaces_ts_1.MemoryRegionSize.WORKING_IRAM - 0x200; i += 4) {
                                    iram.store32(i, 0);
                                }
                            }
                            if (regions & 0x1C) {
                                this.getVideo().renderPath.clearSubsets(interfaces_ts_1.MemoryRegionSize.PALETTE_RAM /* can remove */, regions);
                            }
                            if (regions & 0xE0) {
                                this.getLog().STUB('Unimplemented RegisterRamReset');
                            }
                            break;
                        case 0x02:
                            // Halt
                            this.halt();
                            break;
                        case 0x05:
                            // VBlankIntrWait
                            cpu.gprs[0] = 1;
                            cpu.gprs[1] = 1;
                        // Fall through:
                        case 0x04:
                            // IntrWait
                            if (!this.enable) {
                                const io = this.getIO();
                                io.store16(io.IME, 1);
                            }
                            if (!cpu.gprs[0] && this.interruptFlags & cpu.gprs[1]) {
                                return;
                            }
                            this.dismissIRQs(0xFFFFFFFF);
                            cpu.raiseTrap();
                            break;
                        case 0x06:
                            // Div
                            var result = (cpu.gprs[0] | 0) / (cpu.gprs[1] | 0);
                            var mod = (cpu.gprs[0] | 0) % (cpu.gprs[1] | 0);
                            cpu.gprs[0] = result | 0;
                            cpu.gprs[1] = mod | 0;
                            cpu.gprs[3] = Math.abs(result | 0);
                            break;
                        case 0x07:
                            // DivArm
                            var result = (cpu.gprs[1] | 0) / (cpu.gprs[0] | 0);
                            var mod = (cpu.gprs[1] | 0) % (cpu.gprs[0] | 0);
                            cpu.gprs[0] = result | 0;
                            cpu.gprs[1] = mod | 0;
                            cpu.gprs[3] = Math.abs(result | 0);
                            break;
                        case 0x08:
                            // Sqrt
                            var root = Math.sqrt(cpu.gprs[0]);
                            cpu.gprs[0] = root | 0; // Coerce down to int
                            break;
                        case 0x0A:
                            // ArcTan2
                            var x = cpu.gprs[0] / 16384;
                            var y = cpu.gprs[1] / 16384;
                            cpu.gprs[0] = (Math.atan2(y, x) / (2 * Math.PI)) * 0x10000;
                            break;
                        case 0x0B:
                            // CpuSet
                            var source = cpu.gprs[0];
                            var dest = cpu.gprs[1];
                            var mode = cpu.gprs[2];
                            var count = mode & 0x000FFFFF;
                            var fill = mode & 0x01000000;
                            var wordsize = (mode & 0x04000000) ? 4 : 2;
                            if (fill) {
                                if (wordsize == 4) {
                                    source &= 0xFFFFFFFC;
                                    dest &= 0xFFFFFFFC;
                                    var word = cpu.mmu.load32(source);
                                    for (var i = 0; i < count; ++i) {
                                        cpu.mmu.store32(dest + (i << 2), word);
                                    }
                                }
                                else {
                                    source &= 0xFFFFFFFE;
                                    dest &= 0xFFFFFFFE;
                                    var word = cpu.mmu.load16(source);
                                    for (var i = 0; i < count; ++i) {
                                        cpu.mmu.store16(dest + (i << 1), word);
                                    }
                                }
                            }
                            else {
                                if (wordsize == 4) {
                                    source &= 0xFFFFFFFC;
                                    dest &= 0xFFFFFFFC;
                                    for (var i = 0; i < count; ++i) {
                                        var word = cpu.mmu.load32(source + (i << 2));
                                        cpu.mmu.store32(dest + (i << 2), word);
                                    }
                                }
                                else {
                                    source &= 0xFFFFFFFE;
                                    dest &= 0xFFFFFFFE;
                                    for (var i = 0; i < count; ++i) {
                                        var word = cpu.mmu.load16(source + (i << 1));
                                        cpu.mmu.store16(dest + (i << 1), word);
                                    }
                                }
                            }
                            return;
                        case 0x0C:
                            // FastCpuSet
                            var source = cpu.gprs[0] & 0xFFFFFFFC;
                            var dest = cpu.gprs[1] & 0xFFFFFFFC;
                            var mode = cpu.gprs[2];
                            var count = mode & 0x000FFFFF;
                            count = ((count + 7) >> 3) << 3;
                            var fill = mode & 0x01000000;
                            if (fill) {
                                var word = cpu.mmu.load32(source);
                                for (var i = 0; i < count; ++i) {
                                    cpu.mmu.store32(dest + (i << 2), word);
                                }
                            }
                            else {
                                for (var i = 0; i < count; ++i) {
                                    var word = cpu.mmu.load32(source + (i << 2));
                                    cpu.mmu.store32(dest + (i << 2), word);
                                }
                            }
                            return;
                        case 0x0E:
                            // BgAffineSet
                            var i = cpu.gprs[2];
                            var ox, oy;
                            var cx, cy;
                            var sx, sy;
                            var theta;
                            var offset = cpu.gprs[0];
                            var destination = cpu.gprs[1];
                            var a, b, c, d;
                            var rx, ry;
                            while (i--) {
                                // [ sx   0  0 ]   [ cos(theta)  -sin(theta)  0 ]   [ 1  0  cx - ox ]   [ A B rx ]
                                // [  0  sy  0 ] * [ sin(theta)   cos(theta)  0 ] * [ 0  1  cy - oy ] = [ C D ry ]
                                // [  0   0  1 ]   [     0            0       1 ]   [ 0  0     1    ]   [ 0 0  1 ]
                                ox = cpu.mmu.load32(offset) / 256;
                                oy = cpu.mmu.load32(offset + 4) / 256;
                                cx = cpu.mmu.load16(offset + 8);
                                cy = cpu.mmu.load16(offset + 10);
                                sx = cpu.mmu.load16(offset + 12) / 256;
                                sy = cpu.mmu.load16(offset + 14) / 256;
                                theta = (cpu.mmu.loadU16(offset + 16) >> 8) / 128 * Math.PI;
                                offset += 20;
                                // Rotation
                                a = d = Math.cos(theta);
                                b = c = Math.sin(theta);
                                // Scale
                                a *= sx;
                                b *= -sx;
                                c *= sy;
                                d *= sy;
                                // Translate
                                rx = ox - (a * cx + b * cy);
                                ry = oy - (c * cx + d * cy);
                                cpu.mmu.store16(destination, (a * 256) | 0);
                                cpu.mmu.store16(destination + 2, (b * 256) | 0);
                                cpu.mmu.store16(destination + 4, (c * 256) | 0);
                                cpu.mmu.store16(destination + 6, (d * 256) | 0);
                                cpu.mmu.store32(destination + 8, (rx * 256) | 0);
                                cpu.mmu.store32(destination + 12, (ry * 256) | 0);
                                destination += 16;
                            }
                            break;
                        case 0x0F:
                            // ObjAffineSet
                            var i = cpu.gprs[2];
                            var sx, sy;
                            var theta;
                            var offset = cpu.gprs[0];
                            var destination = cpu.gprs[1];
                            var diff = cpu.gprs[3];
                            var a, b, c, d;
                            while (i--) {
                                // [ sx   0 ]   [ cos(theta)  -sin(theta) ]   [ A B ]
                                // [  0  sy ] * [ sin(theta)   cos(theta) ] = [ C D ]
                                sx = cpu.mmu.load16(offset) / 256;
                                sy = cpu.mmu.load16(offset + 2) / 256;
                                theta = (cpu.mmu.loadU16(offset + 4) >> 8) / 128 * Math.PI;
                                offset += 6;
                                // Rotation
                                a = d = Math.cos(theta);
                                b = c = Math.sin(theta);
                                // Scale
                                a *= sx;
                                b *= -sx;
                                c *= sy;
                                d *= sy;
                                cpu.mmu.store16(destination, (a * 256) | 0);
                                cpu.mmu.store16(destination + diff, (b * 256) | 0);
                                cpu.mmu.store16(destination + diff * 2, (c * 256) | 0);
                                cpu.mmu.store16(destination + diff * 3, (d * 256) | 0);
                                destination += diff * 4;
                            }
                            break;
                        case 0x11:
                            // LZ77UnCompWram
                            this.lz77(cpu.gprs[0], cpu.gprs[1], 1);
                            break;
                        case 0x12:
                            // LZ77UnCompVram
                            this.lz77(cpu.gprs[0], cpu.gprs[1], 2);
                            break;
                        case 0x13:
                            // HuffUnComp
                            this.huffman(cpu.gprs[0], cpu.gprs[1]);
                            break;
                        case 0x14:
                            // RlUnCompWram
                            this.rl(cpu.gprs[0], cpu.gprs[1], 1);
                            break;
                        case 0x15:
                            // RlUnCompVram
                            this.rl(cpu.gprs[0], cpu.gprs[1], 2);
                            break;
                        case 0x1F:
                            // MidiKey2Freq
                            var key = cpu.mmu.load32(cpu.gprs[0] + 4);
                            cpu.gprs[0] = key / Math.pow(2, (180 - cpu.gprs[1] - cpu.gprs[2] / 256) / 12) >>> 0;
                            break;
                        default:
                            throw "Unimplemented software interrupt: 0x" + opcode.toString(16);
                    }
                }
                getVideo() {
                    if (!this.video) {
                        throw new Error("video no init");
                    }
                    return this.video;
                }
                getIO() {
                    if (!this.io) {
                        throw new Error("io no init");
                    }
                    return this.io;
                }
                /**
                 *
                 * @param value
                 */
                masterEnable(value) {
                    this.enable = value;
                    if (this.enable && this.getenabledIRSsValue() & this.interruptFlags) {
                        this.getCPU().raiseIRQ();
                    }
                }
                getLog() {
                    return this.core;
                }
                /**
                 *
                 * @param value
                 */
                setInterruptsEnabled(value) {
                    this.enabledIRQs = value;
                    const enable = this.enabledIRQs ? 1 : 0;
                    const log = this.getLog();
                    if (enable & this.MASK_SIO) {
                        log.STUB('Serial I/O interrupts not implemented');
                    }
                    if (enable & this.MASK_KEYPAD) {
                        log.STUB('Keypad interrupts not implemented');
                    }
                    if (this.enable && enable & this.interruptFlags) {
                        this.getCPU().raiseIRQ();
                    }
                }
                getAudio() {
                    if (!this.audio) {
                        throw new Error("audio no init");
                    }
                    return this.audio;
                }
                /**
                 *
                 */
                pollNextEvent() {
                    let nextEvent = this.getVideo().nextEvent;
                    let test;
                    const audio = this.getAudio();
                    if (audio.enabled) {
                        test = audio.nextEvent;
                        if (!nextEvent || test < nextEvent) {
                            nextEvent = test;
                        }
                    }
                    if (this.timersEnabled) {
                        let timer = this.timers[0];
                        test = timer.nextEvent;
                        if (timer.enable && test && (!nextEvent || test < nextEvent)) {
                            nextEvent = test;
                        }
                        timer = this.timers[1];
                        test = timer.nextEvent;
                        if (timer.enable && test && (!nextEvent || test < nextEvent)) {
                            nextEvent = test;
                        }
                        timer = this.timers[2];
                        test = timer.nextEvent;
                        if (timer.enable && test && (!nextEvent || test < nextEvent)) {
                            nextEvent = test;
                        }
                        timer = this.timers[3];
                        test = timer.nextEvent;
                        if (timer.enable && test && (!nextEvent || test < nextEvent)) {
                            nextEvent = test;
                        }
                    }
                    let dma = this.dma[0];
                    test = dma.nextIRQ;
                    if (dma.enable && dma.doIrq && test && (!nextEvent || test < nextEvent)) {
                        nextEvent = test;
                    }
                    dma = this.dma[1];
                    test = dma.nextIRQ;
                    if (dma.enable && dma.doIrq && test && (!nextEvent || test < nextEvent)) {
                        nextEvent = test;
                    }
                    dma = this.dma[2];
                    test = dma.nextIRQ;
                    if (dma.enable && dma.doIrq && test && (!nextEvent || test < nextEvent)) {
                        nextEvent = test;
                    }
                    dma = this.dma[3];
                    test = dma.nextIRQ;
                    if (dma.enable && dma.doIrq && test && (!nextEvent || test < nextEvent)) {
                        nextEvent = test;
                    }
                    // this.cpu.ASSERT(nextEvent >= this.cpu.cycles, "Next event is before present");
                    this.nextEvent = nextEvent;
                }
                /**
                 *
                 */
                waitForIRQ() {
                    let timer;
                    const video = this.getVideo();
                    let irqPending = this.testIRQ() || video.hblankIRQ > 0 || video.vblankIRQ > 0 || video.vcounterIRQ > 0;
                    if (this.timersEnabled) {
                        timer = this.timers[0];
                        irqPending = irqPending || timer.doIrq;
                        timer = this.timers[1];
                        irqPending = irqPending || timer.doIrq;
                        timer = this.timers[2];
                        irqPending = irqPending || timer.doIrq;
                        timer = this.timers[3];
                        irqPending = irqPending || timer.doIrq;
                    }
                    if (!irqPending) {
                        return false;
                    }
                    const cpu = this.getCPU();
                    for (;;) {
                        this.pollNextEvent();
                        if (!this.nextEvent) {
                            return false;
                        }
                        else {
                            cpu.cycles = this.nextEvent;
                            this.updateTimers();
                            if (this.interruptFlags) {
                                return true;
                            }
                        }
                    }
                }
                getenabledIRSsValue() {
                    return this.enabledIRQs ? 1 : 0;
                }
                /**
                 *
                 */
                testIRQ() {
                    if (this.enable && this.getenabledIRSsValue() & this.interruptFlags) {
                        this.springIRQ = true;
                        this.nextEvent = this.getCPU().cycles;
                        return true;
                    }
                    return false;
                }
                /**
                 *
                 * @param irqType
                 */
                raiseIRQ(irqType) {
                    this.interruptFlags |= 1 << irqType;
                    const io = this.getIO();
                    io.registers[io.IF >> 1] = this.interruptFlags;
                    if (this.enable && (this.getenabledIRSsValue() & 1 << irqType)) {
                        this.getCPU().raiseIRQ();
                    }
                }
                /**
                 *
                 * @param irqMask
                 */
                dismissIRQs(irqMask) {
                    this.interruptFlags &= ~irqMask;
                    const io = this.getIO();
                    io.registers[io.IF >> 1] = this.interruptFlags;
                }
                /**
                 *
                 * @param dma
                 * @param address
                 */
                dmaSetSourceAddress(dma, address) {
                    this.dma[dma].source = address & 0xFFFFFFFE;
                }
                /**
                 *
                 * @param dma
                 * @param address
                 */
                dmaSetDestAddress(dma, address) {
                    this.dma[dma].dest = address & 0xFFFFFFFE;
                }
                /**
                 *
                 * @param dma
                 * @param count
                 */
                dmaSetWordCount(dma, count) {
                    this.dma[dma].count = count ? count : (dma == 3 ? 0x10000 : 0x4000);
                }
                /**
                 *
                 * @param dma
                 * @param control
                 */
                dmaWriteControl(dma, control) {
                    var currentDma = this.dma[dma];
                    var wasEnabled = currentDma.enable;
                    currentDma.dstControl = (control & 0x0060) >> 5;
                    currentDma.srcControl = (control & 0x0180) >> 7;
                    currentDma.repeat = !!(control & 0x0200);
                    currentDma.width = (control & 0x0400) ? 4 : 2;
                    currentDma.drq = !!(control & 0x0800);
                    currentDma.timing = (control & 0x3000) >> 12;
                    currentDma.doIrq = !!(control & 0x4000);
                    currentDma.enable = !!(control & 0x8000);
                    currentDma.nextIRQ = 0;
                    if (currentDma.drq) {
                        this.getLog().WARN('DRQ not implemented');
                    }
                    if (!wasEnabled && currentDma.enable) {
                        currentDma.nextSource = currentDma.source;
                        currentDma.nextDest = currentDma.dest;
                        currentDma.nextCount = currentDma.count;
                        this.getGBAMMU().scheduleDma(dma, currentDma);
                    }
                }
                /**
                 *
                 * @param timer
                 * @param reload
                 */
                timerSetReload(timer, reload) {
                    this.timers[timer].reload = reload & 0xFFFF;
                }
                timerWriteControl(timer, control) {
                    var currentTimer = this.timers[timer];
                    var oldPrescale = currentTimer.prescaleBits;
                    switch (control & 0x0003) {
                        case 0x0000:
                            currentTimer.prescaleBits = 0;
                            break;
                        case 0x0001:
                            currentTimer.prescaleBits = 6;
                            break;
                        case 0x0002:
                            currentTimer.prescaleBits = 8;
                            break;
                        case 0x0003:
                            currentTimer.prescaleBits = 10;
                            break;
                    }
                    currentTimer.countUp = !!(control & 0x0004);
                    currentTimer.doIrq = !!(control & 0x0040);
                    currentTimer.overflowInterval = (0x10000 - currentTimer.reload) << currentTimer.prescaleBits;
                    var wasEnabled = currentTimer.enable;
                    currentTimer.enable = !!(((control & 0x0080) >> 7) << timer);
                    const cpu = this.getCPU();
                    const io = this.getIO();
                    if (!wasEnabled && currentTimer.enable) {
                        if (!currentTimer.countUp) {
                            currentTimer.lastEvent = cpu.cycles;
                            currentTimer.nextEvent = cpu.cycles + currentTimer.overflowInterval;
                        }
                        else {
                            currentTimer.nextEvent = 0;
                        }
                        io.registers[(io.TM0CNT_LO + (timer << 2)) >> 1] = currentTimer.reload;
                        currentTimer.oldReload = currentTimer.reload;
                        ++this.timersEnabled;
                    }
                    else if (wasEnabled && !currentTimer.enable) {
                        if (!currentTimer.countUp) {
                            io.registers[(io.TM0CNT_LO + (timer << 2)) >> 1] = currentTimer.oldReload + (cpu.cycles - currentTimer.lastEvent) >> oldPrescale;
                        }
                        --this.timersEnabled;
                    }
                    else if (currentTimer.prescaleBits != oldPrescale && !currentTimer.countUp) {
                        // FIXME: this might be before present
                        currentTimer.nextEvent = currentTimer.lastEvent + currentTimer.overflowInterval;
                    }
                    // We've changed the timers somehow...we need to reset the next event
                    this.pollNextEvent();
                }
                /**
                 *
                 * @param timer
                 */
                timerRead(timer) {
                    var currentTimer = this.timers[timer];
                    if (currentTimer.enable && !currentTimer.countUp) {
                        return currentTimer.oldReload + (this.getCPU().cycles - currentTimer.lastEvent) >> currentTimer.prescaleBits;
                    }
                    else {
                        const io = this.getIO();
                        return io.registers[(io.TM0CNT_LO + (timer << 2)) >> 1];
                    }
                }
                /**
                 *
                 */
                halt() {
                    if (!this.enable) {
                        throw "Requested HALT when interrupts were disabled!";
                    }
                    if (!this.waitForIRQ()) {
                        throw "Waiting on interrupt forever.";
                    }
                }
                /**
                 *
                 * @param source
                 * @param dest
                 * @param unitsize
                 */
                lz77(source, dest, unitsize) {
                    // TODO: move to a different file
                    const mmu = this.getGBAMMU();
                    var remaining = (mmu.load32(source) & 0xFFFFFF00) >> 8;
                    // We assume the signature byte (0x10) is correct
                    let blockheader = 0;
                    var sPointer = source + 4;
                    var dPointer = dest;
                    var blocksRemaining = 0;
                    var block;
                    var disp;
                    var bytes;
                    var buffer = 0;
                    var loaded;
                    while (remaining > 0) {
                        if (blocksRemaining) {
                            if (blockheader & 0x80) {
                                // Compressed
                                block = mmu.loadU8(sPointer) | (mmu.loadU8(sPointer + 1) << 8);
                                sPointer += 2;
                                disp = dPointer - (((block & 0x000F) << 8) | ((block & 0xFF00) >> 8)) - 1;
                                bytes = ((block & 0x00F0) >> 4) + 3;
                                while (bytes-- && remaining) {
                                    loaded = mmu.loadU8(disp++);
                                    if (unitsize == 2) {
                                        buffer >>= 8;
                                        buffer |= loaded << 8;
                                        if (dPointer & 1) {
                                            mmu.store16(dPointer - 1, buffer);
                                        }
                                    }
                                    else {
                                        mmu.store8(dPointer, loaded);
                                    }
                                    --remaining;
                                    ++dPointer;
                                }
                            }
                            else {
                                // Uncompressed
                                loaded = mmu.loadU8(sPointer++);
                                if (unitsize == 2) {
                                    buffer >>= 8;
                                    buffer |= loaded << 8;
                                    if (dPointer & 1) {
                                        mmu.store16(dPointer - 1, buffer);
                                    }
                                }
                                else {
                                    mmu.store8(dPointer, loaded);
                                }
                                --remaining;
                                ++dPointer;
                            }
                            blockheader <<= 1;
                            --blocksRemaining;
                        }
                        else {
                            blockheader = mmu.loadU8(sPointer++);
                            blocksRemaining = 8;
                        }
                    }
                }
                /**
                 *
                 * @param source
                 * @param dest
                 */
                huffman(source, dest) {
                    source = source & 0xFFFFFFFC;
                    const mmu = this.getGBAMMU();
                    const header = mmu.load32(source);
                    const bits = header & 0xF;
                    if (32 % bits) {
                        throw 'Unimplemented unaligned Huffman';
                    }
                    let remaining = header >> 8;
                    const padding = (4 - remaining) & 0x3;
                    remaining &= 0xFFFFFFFC;
                    let tree = [];
                    const treesize = (mmu.loadU8(source + 4) << 1) + 1;
                    let block = 0;
                    let sPointer = source + 5 + treesize;
                    let dPointer = dest & 0xFFFFFFFC;
                    for (let i = 0; i < treesize; ++i) {
                        tree.push(mmu.loadU8(source + 5 + i));
                    }
                    let node;
                    let offset = 0;
                    let bitsRemaining;
                    let readBits;
                    let bitsSeen = 0;
                    node = tree[0];
                    while (remaining > 0) {
                        var bitstream = mmu.load32(sPointer);
                        sPointer += 4;
                        for (bitsRemaining = 32; bitsRemaining > 0; --bitsRemaining, bitstream <<= 1) {
                            if (typeof (node) === 'number') {
                                // Lazily construct tree
                                const next = (offset - 1 | 1) + ((node & 0x3F) << 1) + 2;
                                node = {
                                    l: next,
                                    r: next + 1,
                                    lTerm: node & 0x80,
                                    rTerm: node & 0x40
                                };
                                tree[offset] = node;
                            }
                            if (bitstream & 0x80000000) {
                                // Go right
                                if (node.rTerm) {
                                    readBits = tree[node.r];
                                }
                                else {
                                    offset = node.r;
                                    node = tree[node.r];
                                    continue;
                                }
                            }
                            else {
                                // Go left
                                if (node.lTerm) {
                                    readBits = tree[node.l];
                                }
                                else {
                                    offset = node.l;
                                    node = tree[offset];
                                    continue;
                                }
                            }
                            block |= (readBits & ((1 << bits) - 1)) << bitsSeen;
                            bitsSeen += bits;
                            offset = 0;
                            node = tree[0];
                            if (bitsSeen == 32) {
                                bitsSeen = 0;
                                mmu.store32(dPointer, block);
                                dPointer += 4;
                                remaining -= 4;
                                block = 0;
                            }
                        }
                    }
                    if (padding) {
                        mmu.store32(dPointer, block);
                    }
                }
                /**
                 *
                 * @param source
                 * @param dest
                 * @param unitsize
                 */
                rl(source, dest, unitsize) {
                    source = source & 0xFFFFFFFC;
                    const mmu = this.getGBAMMU();
                    var remaining = (mmu.load32(source) & 0xFFFFFF00) >> 8;
                    var padding = (4 - remaining) & 0x3;
                    // We assume the signature byte (0x30) is correct
                    var blockheader;
                    var block;
                    var sPointer = source + 4;
                    var dPointer = dest;
                    var buffer = 0;
                    while (remaining > 0) {
                        blockheader = mmu.loadU8(sPointer++);
                        if (blockheader & 0x80) {
                            // Compressed
                            blockheader &= 0x7F;
                            blockheader += 3;
                            block = mmu.loadU8(sPointer++);
                            while (blockheader-- && remaining) {
                                --remaining;
                                if (unitsize == 2) {
                                    buffer >>= 8;
                                    buffer |= block << 8;
                                    if (dPointer & 1) {
                                        mmu.store16(dPointer - 1, buffer);
                                    }
                                }
                                else {
                                    mmu.store8(dPointer, block);
                                }
                                ++dPointer;
                            }
                        }
                        else {
                            // Uncompressed
                            blockheader++;
                            while (blockheader-- && remaining) {
                                --remaining;
                                block = mmu.loadU8(sPointer++);
                                if (unitsize == 2) {
                                    buffer >>= 8;
                                    buffer |= block << 8;
                                    if (dPointer & 1) {
                                        mmu.store16(dPointer - 1, buffer);
                                    }
                                }
                                else {
                                    mmu.store8(dPointer, block);
                                }
                                ++dPointer;
                            }
                        }
                    }
                    while (padding--) {
                        mmu.store8(dPointer++, 0);
                    }
                }
            };
            exports_4("default", GameBoyAdvanceInterruptHandler);
        }
    };
});
System.register("irq/mod", ["irq/GameBoyAdvanceInterruptHandler"], function (exports_5, context_5) {
    "use strict";
    var GameBoyAdvanceInterruptHandler_ts_1;
    var __moduleName = context_5 && context_5.id;
    return {
        setters: [
            function (GameBoyAdvanceInterruptHandler_ts_1_1) {
                GameBoyAdvanceInterruptHandler_ts_1 = GameBoyAdvanceInterruptHandler_ts_1_1;
            }
        ],
        execute: function () {
            exports_5("GameBoyAdvanceInterruptHandler", GameBoyAdvanceInterruptHandler_ts_1.default);
        }
    };
});

const __exp = __instantiate("irq/mod", false);
export const GameBoyAdvanceInterruptHandler = __exp["GameBoyAdvanceInterruptHandler"];
