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
System.register("keypad/GameBoyAdvanceKeypad", [], function (exports_2, context_2) {
    "use strict";
    var GameBoyAdvanceKeypad;
    var __moduleName = context_2 && context_2.id;
    return {
        setters: [],
        execute: function () {
            GameBoyAdvanceKeypad = class GameBoyAdvanceKeypad {
                constructor() {
                    this.KEYCODE_LEFT = 37;
                    this.KEYCODE_UP = 38;
                    this.KEYCODE_RIGHT = 39;
                    this.KEYCODE_DOWN = 40;
                    this.KEYCODE_START = 13;
                    this.KEYCODE_SELECT = 220;
                    this.KEYCODE_A = 90;
                    this.KEYCODE_B = 88;
                    this.KEYCODE_L = 65;
                    this.KEYCODE_R = 83;
                    this.GAMEPAD_LEFT = 14;
                    this.GAMEPAD_UP = 12;
                    this.GAMEPAD_RIGHT = 15;
                    this.GAMEPAD_DOWN = 13;
                    this.GAMEPAD_START = 9;
                    this.GAMEPAD_SELECT = 8;
                    this.GAMEPAD_A = 1;
                    this.GAMEPAD_B = 0;
                    this.GAMEPAD_L = 4;
                    this.GAMEPAD_R = 5;
                    this.GAMEPAD_THRESHOLD = 0.2;
                    this.A = 0;
                    this.B = 1;
                    this.SELECT = 2;
                    this.START = 3;
                    this.RIGHT = 4;
                    this.LEFT = 5;
                    this.UP = 6;
                    this.DOWN = 7;
                    this.R = 8;
                    this.L = 9;
                    this.currentDown = 0x03FF;
                    this.eatInput = false;
                    this.gamepads = [];
                }
                keyboardHandler(e) {
                    let toggle = 0;
                    switch (e.keyCode) {
                        case this.KEYCODE_START:
                            toggle = this.START;
                            break;
                        case this.KEYCODE_SELECT:
                            toggle = this.SELECT;
                            break;
                        case this.KEYCODE_A:
                            toggle = this.A;
                            break;
                        case this.KEYCODE_B:
                            toggle = this.B;
                            break;
                        case this.KEYCODE_L:
                            toggle = this.L;
                            break;
                        case this.KEYCODE_R:
                            toggle = this.R;
                            break;
                        case this.KEYCODE_UP:
                            toggle = this.UP;
                            break;
                        case this.KEYCODE_RIGHT:
                            toggle = this.RIGHT;
                            break;
                        case this.KEYCODE_DOWN:
                            toggle = this.DOWN;
                            break;
                        case this.KEYCODE_LEFT:
                            toggle = this.LEFT;
                            break;
                        default:
                            return;
                    }
                    toggle = 1 << toggle;
                    if (e.type == "keydown") {
                        this.currentDown &= ~toggle;
                    }
                    else {
                        this.currentDown |= toggle;
                    }
                    if (this.eatInput) {
                        e.preventDefault();
                    }
                }
                gamepadHandler(gamepad) {
                    let value = 0;
                    if (gamepad.buttons[this.GAMEPAD_LEFT] > this.GAMEPAD_THRESHOLD) {
                        value |= 1 << this.LEFT;
                    }
                    if (gamepad.buttons[this.GAMEPAD_UP] > this.GAMEPAD_THRESHOLD) {
                        value |= 1 << this.UP;
                    }
                    if (gamepad.buttons[this.GAMEPAD_RIGHT] > this.GAMEPAD_THRESHOLD) {
                        value |= 1 << this.RIGHT;
                    }
                    if (gamepad.buttons[this.GAMEPAD_DOWN] > this.GAMEPAD_THRESHOLD) {
                        value |= 1 << this.DOWN;
                    }
                    if (gamepad.buttons[this.GAMEPAD_START] > this.GAMEPAD_THRESHOLD) {
                        value |= 1 << this.START;
                    }
                    if (gamepad.buttons[this.GAMEPAD_SELECT] > this.GAMEPAD_THRESHOLD) {
                        value |= 1 << this.SELECT;
                    }
                    if (gamepad.buttons[this.GAMEPAD_A] > this.GAMEPAD_THRESHOLD) {
                        value |= 1 << this.A;
                    }
                    if (gamepad.buttons[this.GAMEPAD_B] > this.GAMEPAD_THRESHOLD) {
                        value |= 1 << this.B;
                    }
                    if (gamepad.buttons[this.GAMEPAD_L] > this.GAMEPAD_THRESHOLD) {
                        value |= 1 << this.L;
                    }
                    if (gamepad.buttons[this.GAMEPAD_R] > this.GAMEPAD_THRESHOLD) {
                        value |= 1 << this.R;
                    }
                    this.currentDown = ~value & 0x3FF;
                }
                /**
                 *
                 * @param gamepad
                 */
                gamepadConnectHandler(gamepad) {
                    this.gamepads.push(gamepad);
                }
                /**
                 *
                 * @param gamepad
                 */
                gamepadDisconnectHandler(gamepad) {
                    this.gamepads = this.gamepads.filter((other) => other != gamepad);
                }
                /**
                 *
                 */
                pollGamepads() {
                    let navigatorList = [];
                    // @ts-ignore
                    if (navigator.webkitGetGamepads) {
                        // @ts-ignore
                        navigatorList = navigator.webkitGetGamepads();
                        // @ts-ignore
                    }
                    else if (navigator.getGamepads) {
                        // @ts-ignore
                        navigatorList = navigator.getGamepads();
                    }
                    // Let's all give a shout out to Chrome for making us get the gamepads EVERY FRAME
                    if (navigatorList.length) {
                        this.gamepads = [];
                    }
                    for (var i = 0; i < navigatorList.length; ++i) {
                        if (navigatorList[i]) {
                            this.gamepads.push(navigatorList[i]);
                        }
                    }
                    if (this.gamepads.length > 0) {
                        this.gamepadHandler(this.gamepads[0]);
                    }
                }
                /**
                 *
                 */
                registerHandlers() {
                    // @ts-ignore
                    window.addEventListener("keydown", this.keyboardHandler.bind(this), true);
                    // @ts-ignore
                    window.addEventListener("keyup", this.keyboardHandler.bind(this), true);
                    // @ts-ignore
                    window.addEventListener("gamepadconnected", this.gamepadConnectHandler.bind(this), true);
                    // @ts-ignore
                    window.addEventListener("mozgamepadconnected", this.gamepadConnectHandler.bind(this), true);
                    // @ts-ignore
                    window.addEventListener("webkitgamepadconnected", this.gamepadConnectHandler.bind(this), true);
                    // @ts-ignore
                    window.addEventListener("gamepaddisconnected", this.gamepadDisconnectHandler.bind(this), true);
                    // @ts-ignore
                    window.addEventListener("mozgamepaddisconnected", this.gamepadDisconnectHandler.bind(this), true);
                    // @ts-ignore
                    window.addEventListener("webkitgamepaddisconnected", this.gamepadDisconnectHandler.bind(this), true);
                }
            };
            exports_2("default", GameBoyAdvanceKeypad);
        }
    };
});
System.register("keypad/mod", ["keypad/GameBoyAdvanceKeypad"], function (exports_3, context_3) {
    "use strict";
    var GameBoyAdvanceKeypad_ts_1;
    var __moduleName = context_3 && context_3.id;
    return {
        setters: [
            function (GameBoyAdvanceKeypad_ts_1_1) {
                GameBoyAdvanceKeypad_ts_1 = GameBoyAdvanceKeypad_ts_1_1;
            }
        ],
        execute: function () {
            exports_3("GameBoyAdvanceKeypad", GameBoyAdvanceKeypad_ts_1.default);
        }
    };
});

const __exp = __instantiate("keypad/mod", false);
export const GameBoyAdvanceKeypad = __exp["GameBoyAdvanceKeypad"];
