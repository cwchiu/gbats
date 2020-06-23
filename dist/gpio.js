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
System.register("gpio/GameBoyAdvanceRTC", [], function (exports_2, context_2) {
    "use strict";
    var GameBoyAdvanceRTC;
    var __moduleName = context_2 && context_2.id;
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
            exports_2("default", GameBoyAdvanceRTC);
        }
    };
});
System.register("gpio/GameBoyAdvanceGPIO", ["gpio/GameBoyAdvanceRTC"], function (exports_3, context_3) {
    "use strict";
    var GameBoyAdvanceRTC_ts_1, GameBoyAdvanceGPIO;
    var __moduleName = context_3 && context_3.id;
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
            exports_3("default", GameBoyAdvanceGPIO);
        }
    };
});
System.register("utils", [], function (exports_4, context_4) {
    "use strict";
    var Serializer;
    var __moduleName = context_4 && context_4.id;
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
    exports_4("hex", hex);
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
            exports_4("Serializer", Serializer);
        }
    };
});
System.register("gpio/GameBoyAdvanceSIO", ["utils"], function (exports_5, context_5) {
    "use strict";
    var utils_ts_1, GameBoyAdvanceSIO;
    var __moduleName = context_5 && context_5.id;
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
            exports_5("default", GameBoyAdvanceSIO);
        }
    };
});
System.register("gpio/mod", ["gpio/GameBoyAdvanceGPIO", "gpio/GameBoyAdvanceSIO"], function (exports_6, context_6) {
    "use strict";
    var GameBoyAdvanceGPIO_ts_1, GameBoyAdvanceSIO_ts_1;
    var __moduleName = context_6 && context_6.id;
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
            exports_6("GameBoyAdvanceGPIO", GameBoyAdvanceGPIO_ts_1.default);
            exports_6("GameBoyAdvanceSIO", GameBoyAdvanceSIO_ts_1.default);
        }
    };
});

const __exp = __instantiate("gpio/mod", false);
export const GameBoyAdvanceGPIO = __exp["GameBoyAdvanceGPIO"];
export const GameBoyAdvanceSIO = __exp["GameBoyAdvanceSIO"];
