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
System.register("constants", [], function (exports_2, context_2) {
    "use strict";
    var SHIFT_32;
    var __moduleName = context_2 && context_2.id;
    return {
        setters: [],
        execute: function () {
            exports_2("SHIFT_32", SHIFT_32 = 1 / 0x100000000);
        }
    };
});
System.register("core/ARMCoreArm", ["interfaces", "constants"], function (exports_3, context_3) {
    "use strict";
    var interfaces_ts_1, constants_ts_1, ARMCoreArm;
    var __moduleName = context_3 && context_3.id;
    return {
        setters: [
            function (interfaces_ts_1_1) {
                interfaces_ts_1 = interfaces_ts_1_1;
            },
            function (constants_ts_1_1) {
                constants_ts_1 = constants_ts_1_1;
            }
        ],
        execute: function () {
            ARMCoreArm = class ARMCoreArm {
                constructor(cpu) {
                    this.cpu = cpu;
                    this.addressingMode23Immediate = [
                        // 000x0
                        function (rn, offset, condOp) {
                            const gprs = cpu.gprs;
                            const address = function () {
                                var addr = gprs[rn];
                                if (!condOp || condOp()) {
                                    gprs[rn] -= offset;
                                }
                                return addr;
                            };
                            address.writesPC = rn == cpu.PC;
                            return address;
                        },
                        // 000xW
                        null,
                        null,
                        null,
                        // 00Ux0
                        function (rn, offset, condOp) {
                            const gprs = cpu.gprs;
                            const address = function () {
                                const addr = gprs[rn];
                                if (!condOp || condOp()) {
                                    gprs[rn] += offset;
                                }
                                return addr;
                            };
                            address.writesPC = rn == cpu.PC;
                            return address;
                        },
                        // 00UxW
                        null,
                        null,
                        null,
                        // 0P0x0
                        function (rn, offset, condOp) {
                            const gprs = cpu.gprs;
                            const address = function () {
                                return gprs[rn] - offset;
                            };
                            address.writesPC = false;
                            return address;
                        },
                        // 0P0xW
                        function (rn, offset, condOp) {
                            const gprs = cpu.gprs;
                            const address = function () {
                                const addr = gprs[rn] - offset;
                                if (!condOp || condOp()) {
                                    gprs[rn] = addr;
                                }
                                return addr;
                            };
                            address.writesPC = rn == cpu.PC;
                            return address;
                        },
                        null,
                        null,
                        // 0PUx0
                        function (rn, offset, condOp) {
                            const gprs = cpu.gprs;
                            const address = function () {
                                return gprs[rn] + offset;
                            };
                            address.writesPC = false;
                            return address;
                        },
                        // 0PUxW
                        function (rn, offset, condOp) {
                            const gprs = cpu.gprs;
                            const address = function () {
                                const addr = gprs[rn] + offset;
                                if (!condOp || condOp()) {
                                    gprs[rn] = addr;
                                }
                                return addr;
                            };
                            address.writesPC = rn == cpu.PC;
                            return address;
                        },
                        null,
                        null,
                    ];
                    this.addressingMode23Register = [
                        // I00x0
                        function (rn, rm, condOp) {
                            const gprs = cpu.gprs;
                            const address = function () {
                                const addr = gprs[rn];
                                if (!condOp || condOp()) {
                                    gprs[rn] -= gprs[rm];
                                }
                                return addr;
                            };
                            address.writesPC = rn == cpu.PC;
                            return address;
                        },
                        // I00xW
                        null,
                        null,
                        null,
                        // I0Ux0
                        function (rn, rm, condOp) {
                            const gprs = cpu.gprs;
                            const address = function () {
                                const addr = gprs[rn];
                                if (!condOp || condOp()) {
                                    gprs[rn] += gprs[rm];
                                }
                                return addr;
                            };
                            address.writesPC = rn == cpu.PC;
                            return address;
                        },
                        // I0UxW
                        null,
                        null,
                        null,
                        // IP0x0
                        function (rn, rm, condOp) {
                            const gprs = cpu.gprs;
                            const address = function () {
                                return gprs[rn] - gprs[rm];
                            };
                            address.writesPC = false;
                            return address;
                        },
                        // IP0xW
                        function (rn, rm, condOp) {
                            const gprs = cpu.gprs;
                            const address = function () {
                                const addr = gprs[rn] - gprs[rm];
                                if (!condOp || condOp()) {
                                    gprs[rn] = addr;
                                }
                                return addr;
                            };
                            address.writesPC = rn == cpu.PC;
                            return address;
                        },
                        null,
                        null,
                        // IPUx0
                        function (rn, rm, condOp) {
                            const gprs = cpu.gprs;
                            const address = function () {
                                const addr = gprs[rn] + gprs[rm];
                                return addr;
                            };
                            address.writesPC = false;
                            return address;
                        },
                        // IPUxW
                        function (rn, rm, condOp) {
                            const gprs = cpu.gprs;
                            const address = function () {
                                const addr = gprs[rn] + gprs[rm];
                                if (!condOp || condOp()) {
                                    gprs[rn] = addr;
                                }
                                return addr;
                            };
                            address.writesPC = rn == cpu.PC;
                            return address;
                        },
                        null,
                        null
                    ];
                    this.addressingMode2RegisterShifted = [
                        // I00x0
                        function (rn, shiftOp, condOp) {
                            const gprs = cpu.gprs;
                            const address = function () {
                                const addr = gprs[rn];
                                if (!condOp || condOp()) {
                                    shiftOp();
                                    gprs[rn] -= cpu.shifterOperand;
                                }
                                return addr;
                            };
                            address.writesPC = rn == cpu.PC;
                            return address;
                        },
                        // I00xW
                        null,
                        null,
                        null,
                        // I0Ux0
                        function (rn, shiftOp, condOp) {
                            const gprs = cpu.gprs;
                            const address = function () {
                                const addr = gprs[rn];
                                if (!condOp || condOp()) {
                                    shiftOp();
                                    gprs[rn] += cpu.shifterOperand;
                                }
                                return addr;
                            };
                            address.writesPC = rn == cpu.PC;
                            return address;
                        },
                        // I0UxW
                        null,
                        null,
                        null,
                        // IP0x0
                        function (rn, shiftOp, condOp) {
                            const gprs = cpu.gprs;
                            const address = function () {
                                shiftOp();
                                return gprs[rn] - cpu.shifterOperand;
                            };
                            address.writesPC = false;
                            return address;
                        },
                        // IP0xW
                        function (rn, shiftOp, condOp) {
                            const gprs = cpu.gprs;
                            const address = function () {
                                shiftOp();
                                const addr = gprs[rn] - cpu.shifterOperand;
                                if (!condOp || condOp()) {
                                    gprs[rn] = addr;
                                }
                                return addr;
                            };
                            address.writesPC = rn == cpu.PC;
                            return address;
                        },
                        null,
                        null,
                        // IPUx0
                        function (rn, shiftOp, condOp) {
                            const gprs = cpu.gprs;
                            const address = function () {
                                shiftOp();
                                return gprs[rn] + cpu.shifterOperand;
                            };
                            address.writesPC = false;
                            return address;
                        },
                        // IPUxW
                        function (rn, shiftOp, condOp) {
                            const gprs = cpu.gprs;
                            const address = function () {
                                shiftOp();
                                const addr = gprs[rn] + cpu.shifterOperand;
                                if (!condOp || condOp()) {
                                    gprs[rn] = addr;
                                }
                                return addr;
                            };
                            address.writesPC = (rn === cpu.PC);
                            return address;
                        },
                        null,
                        null,
                    ];
                }
                /**
                 *
                 * @param rs
                 * @param rm
                 */
                constructAddressingMode1ASR(rs, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        ++cpu.cycles;
                        var shift = gprs[rs];
                        if (rs == cpu.PC) {
                            shift += 4;
                        }
                        shift &= 0xFF;
                        var shiftVal = gprs[rm];
                        if (rm == cpu.PC) {
                            shiftVal += 4;
                        }
                        if (shift == 0) {
                            cpu.shifterOperand = shiftVal;
                            cpu.shifterCarryOut = cpu.cpsrC;
                        }
                        else if (shift < 32) {
                            cpu.shifterOperand = shiftVal >> shift;
                            cpu.shifterCarryOut = shiftVal & (1 << (shift - 1));
                        }
                        else if (gprs[rm] >> 31) {
                            cpu.shifterOperand = 0xFFFFFFFF;
                            cpu.shifterCarryOut = 0x80000000;
                        }
                        else {
                            cpu.shifterOperand = 0;
                            cpu.shifterCarryOut = 0;
                        }
                    };
                }
                /**
                 *
                 * @param immediate
                 */
                constructAddressingMode1Immediate(immediate) {
                    const cpu = this.cpu;
                    return function () {
                        cpu.shifterOperand = immediate;
                        cpu.shifterCarryOut = cpu.cpsrC;
                    };
                }
                /**
                 *
                 * @param immediate
                 * @param rotate
                 */
                constructAddressingMode1ImmediateRotate(immediate, rotate) {
                    const cpu = this.cpu;
                    return function () {
                        cpu.shifterOperand = (immediate >>> rotate) | (immediate << (32 - rotate));
                        cpu.shifterCarryOut = cpu.shifterOperand >> 31;
                    };
                }
                /**
                 *
                 * @param rs
                 * @param rm
                 */
                constructAddressingMode1LSL(rs, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        ++cpu.cycles;
                        var shift = gprs[rs];
                        if (rs == cpu.PC) {
                            shift += 4;
                        }
                        shift &= 0xFF;
                        var shiftVal = gprs[rm];
                        if (rm == cpu.PC) {
                            shiftVal += 4;
                        }
                        if (shift == 0) {
                            cpu.shifterOperand = shiftVal;
                            cpu.shifterCarryOut = cpu.cpsrC;
                        }
                        else if (shift < 32) {
                            cpu.shifterOperand = shiftVal << shift;
                            cpu.shifterCarryOut = shiftVal & (1 << (32 - shift));
                        }
                        else if (shift == 32) {
                            cpu.shifterOperand = 0;
                            cpu.shifterCarryOut = shiftVal & 1;
                        }
                        else {
                            cpu.shifterOperand = 0;
                            cpu.shifterCarryOut = 0;
                        }
                    };
                }
                /**
                 *
                 * @param rs
                 * @param rm
                 */
                constructAddressingMode1LSR(rs, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        ++cpu.cycles;
                        var shift = gprs[rs];
                        if (rs == cpu.PC) {
                            shift += 4;
                        }
                        shift &= 0xFF;
                        var shiftVal = gprs[rm];
                        if (rm == cpu.PC) {
                            shiftVal += 4;
                        }
                        if (shift == 0) {
                            cpu.shifterOperand = shiftVal;
                            cpu.shifterCarryOut = cpu.cpsrC;
                        }
                        else if (shift < 32) {
                            cpu.shifterOperand = shiftVal >>> shift;
                            cpu.shifterCarryOut = shiftVal & (1 << (shift - 1));
                        }
                        else if (shift == 32) {
                            cpu.shifterOperand = 0;
                            cpu.shifterCarryOut = shiftVal >> 31;
                        }
                        else {
                            cpu.shifterOperand = 0;
                            cpu.shifterCarryOut = 0;
                        }
                    };
                }
                /**
                 *
                 * @param rs
                 * @param rm
                 */
                constructAddressingMode1ROR(rs, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        ++cpu.cycles;
                        var shift = gprs[rs];
                        if (rs == cpu.PC) {
                            shift += 4;
                        }
                        shift &= 0xFF;
                        var shiftVal = gprs[rm];
                        if (rm == cpu.PC) {
                            shiftVal += 4;
                        }
                        var rotate = shift & 0x1F;
                        if (shift == 0) {
                            cpu.shifterOperand = shiftVal;
                            cpu.shifterCarryOut = cpu.cpsrC;
                        }
                        else if (rotate) {
                            cpu.shifterOperand = (gprs[rm] >>> rotate) | (gprs[rm] << (32 - rotate));
                            cpu.shifterCarryOut = shiftVal & (1 << (rotate - 1));
                        }
                        else {
                            cpu.shifterOperand = shiftVal;
                            cpu.shifterCarryOut = shiftVal >> 31;
                        }
                    };
                }
                /**
                 *
                 * @param instruction
                 * @param immediate
                 * @param condOp
                 */
                constructAddressingMode23Immediate(instruction, immediate, condOp) {
                    const rn = (instruction & 0x000F0000) >> 16;
                    const address = this.addressingMode23Immediate[(instruction & 0x01A00000) >> 21];
                    if (!address) {
                        throw new Error("invliad address");
                    }
                    return address(rn, immediate, condOp);
                }
                /**
                 *
                 * @param instruction
                 * @param rm
                 * @param condOp
                 */
                constructAddressingMode23Register(instruction, rm, condOp) {
                    const rn = (instruction & 0x000F0000) >> 16;
                    const address = this.addressingMode23Register[(instruction & 0x01A00000) >> 21];
                    if (!address) {
                        throw new Error("invliad address");
                    }
                    return address(rn, rm, condOp);
                }
                /**
                 *
                 * @param instruction
                 * @param shiftOp
                 * @param condOp
                 */
                constructAddressingMode2RegisterShifted(instruction, shiftOp, condOp) {
                    const rn = (instruction & 0x000F0000) >> 16;
                    const address = this.addressingMode2RegisterShifted[(instruction & 0x01A00000) >> 21];
                    if (!address) {
                        throw new Error("invliad address");
                    }
                    return address(rn, shiftOp, condOp);
                }
                /**
                 *
                 */
                constructAddressingMode4(immediate, rn) {
                    const gprs = this.cpu.gprs;
                    return function () {
                        return gprs[rn] + immediate;
                    };
                }
                constructAddressingMode4Writeback(immediate, offset, rn, overlap) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function (writeInitial) {
                        var addr = gprs[rn] + immediate;
                        if (writeInitial && overlap) {
                            cpu.mmu.store32(gprs[rn] + immediate - 4, gprs[rn]);
                        }
                        gprs[rn] += offset;
                        return addr;
                    };
                }
                /**
                 * ADC
                 */
                constructADC(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        const shifterOperand = (cpu.shifterOperand >>> 0) + (!!cpu.cpsrC ? 1 : 0);
                        gprs[rd] = (gprs[rn] >>> 0) + shifterOperand;
                    };
                }
                /**
                 * ADCS
                 * @param rd
                 * @param rn
                 * @param shiftOp
                 * @param condOp
                 * @see https://developer.arm.com/docs/100076/0200/a32t32-instruction-set-reference/a32-and-t32-instructions/adc
                 */
                constructADCS(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        var shifterOperand = (cpu.shifterOperand >>> 0) + (!!cpu.cpsrC ? 1 : 0);
                        var d = (gprs[rn] >>> 0) + shifterOperand;
                        if (rd == cpu.PC && cpu.hasSPSR()) {
                            cpu.unpackCPSR(cpu.spsr);
                        }
                        else {
                            cpu.cpsrN = d >> 31;
                            cpu.cpsrZ = !(d & 0xFFFFFFFF) ? 1 : 0;
                            cpu.cpsrC = (d > 0xFFFFFFFF ? 1 : 0);
                            cpu.cpsrV = ((gprs[rn] >> 31) == (shifterOperand >> 31) &&
                                (gprs[rn] >> 31) != (d >> 31) &&
                                (shifterOperand >> 31) != (d >> 31) ? 1 : 0);
                        }
                        gprs[rd] = d;
                    };
                }
                ;
                /**
                 * ADD
                 * @param rd 目的暫存器
                 * @param rn
                 * @param shiftOp
                 * @param condOp
                 * @see https://developer.arm.com/docs/100076/0200/a32t32-instruction-set-reference/a32-and-t32-instructions/add
                 */
                constructADD(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        gprs[rd] = (gprs[rn] >>> 0) + (cpu.shifterOperand >>> 0);
                    };
                }
                /**
                 *
                 * @param rd
                 * @param rn
                 * @param shiftOp
                 * @param condOp
                 */
                constructADDS(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        var d = (gprs[rn] >>> 0) + (cpu.shifterOperand >>> 0);
                        if (rd == cpu.PC && cpu.hasSPSR()) {
                            cpu.unpackCPSR(cpu.spsr);
                        }
                        else {
                            cpu.cpsrN = d >> 31;
                            cpu.cpsrZ = (!(d & 0xFFFFFFFF)) ? 1 : 0;
                            cpu.cpsrC = (d > 0xFFFFFFFF) ? 1 : 0;
                            cpu.cpsrV = ((gprs[rn] >> 31) == (cpu.shifterOperand >> 31) &&
                                (gprs[rn] >> 31) != (d >> 31) &&
                                (cpu.shifterOperand >> 31) != (d >> 31)) ? 1 : 0;
                        }
                        gprs[rd] = d;
                    };
                }
                /**
                 *
                 * @param rd
                 * @param rn
                 * @param shiftOp
                 * @param condOp
                 */
                constructAND(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        gprs[rd] = gprs[rn] & cpu.shifterOperand;
                    };
                }
                ;
                constructANDS(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        gprs[rd] = gprs[rn] & cpu.shifterOperand;
                        if (rd == cpu.PC && cpu.hasSPSR()) {
                            cpu.unpackCPSR(cpu.spsr);
                        }
                        else {
                            cpu.cpsrN = gprs[rd] >> 31;
                            cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF)) ? 1 : 0;
                            cpu.cpsrC = cpu.shifterCarryOut;
                        }
                    };
                }
                ;
                /**
                 *
                 * @param immediate
                 * @param condOp
                 */
                constructB(immediate, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        if (condOp && !condOp()) {
                            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                            return;
                        }
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        gprs[cpu.PC] += immediate;
                    };
                }
                /**
                 *
                 * @param rd
                 * @param rn
                 * @param shiftOp
                 * @param condOp
                 */
                constructBIC(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        gprs[rd] = gprs[rn] & ~cpu.shifterOperand;
                    };
                }
                constructBICS(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        gprs[rd] = gprs[rn] & ~cpu.shifterOperand;
                        if (rd == cpu.PC && cpu.hasSPSR()) {
                            cpu.unpackCPSR(cpu.spsr);
                        }
                        else {
                            cpu.cpsrN = gprs[rd] >> 31;
                            cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF)) ? 1 : 0;
                            cpu.cpsrC = cpu.shifterCarryOut;
                        }
                    };
                }
                /**
                 *
                 * @param immediate
                 * @param condOp
                 */
                constructBL(immediate, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        if (condOp && !condOp()) {
                            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                            return;
                        }
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        gprs[cpu.LR] = gprs[cpu.PC] - 4;
                        gprs[cpu.PC] += immediate;
                    };
                }
                /**
                 *
                 * @param rm
                 * @param condOp
                 */
                constructBX(rm, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        if (condOp && !condOp()) {
                            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                            return;
                        }
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        cpu.switchExecMode(gprs[rm] & 0x00000001);
                        gprs[cpu.PC] = gprs[rm] & 0xFFFFFFFE;
                    };
                }
                /**
                 *
                 * @param rd
                 * @param rn
                 * @param shiftOp
                 * @param condOp
                 */
                constructCMN(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        var aluOut = (gprs[rn] >>> 0) + (cpu.shifterOperand >>> 0);
                        cpu.cpsrN = aluOut >> 31;
                        cpu.cpsrZ = (!(aluOut & 0xFFFFFFFF)) ? 1 : 0;
                        cpu.cpsrC = (aluOut > 0xFFFFFFFF) ? 1 : 0;
                        cpu.cpsrV = ((gprs[rn] >> 31) == (cpu.shifterOperand >> 31) &&
                            (gprs[rn] >> 31) != (aluOut >> 31) &&
                            (cpu.shifterOperand >> 31) != (aluOut >> 31)) ? 1 : 0;
                    };
                }
                /**
                 * CMP
                 * @param rd
                 * @param rn
                 * @param shiftOp
                 * @param condOp
                 */
                constructCMP(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        const aluOut = gprs[rn] - cpu.shifterOperand;
                        cpu.cpsrN = aluOut >> 31;
                        cpu.cpsrZ = (!(aluOut & 0xFFFFFFFF)) ? 1 : 0;
                        cpu.cpsrC = ((gprs[rn] >>> 0) >= (cpu.shifterOperand >>> 0)) ? 1 : 0;
                        cpu.cpsrV = ((gprs[rn] >> 31) != (cpu.shifterOperand >> 31) &&
                            (gprs[rn] >> 31) != (aluOut >> 31)) ? 1 : 0;
                    };
                }
                /**
                 *
                 * @param rd
                 * @param rn
                 * @param shiftOp
                 * @param condOp
                 */
                constructEOR(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        gprs[rd] = gprs[rn] ^ cpu.shifterOperand;
                    };
                }
                ;
                /**
                 * EORS
                 * @param rd
                 * @param rn
                 * @param shiftOp
                 * @param condOp
                 */
                constructEORS(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        gprs[rd] = gprs[rn] ^ cpu.shifterOperand;
                        if (rd == cpu.PC && cpu.hasSPSR()) {
                            cpu.unpackCPSR(cpu.spsr);
                        }
                        else {
                            cpu.cpsrN = gprs[rd] >> 31;
                            cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF)) ? 1 : 0;
                            cpu.cpsrC = cpu.shifterCarryOut;
                        }
                    };
                }
                /**
                 * LDM
                 * @param rs
                 * @param address
                 * @param condOp
                 */
                constructLDM(rs, address, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    const mmu = cpu.mmu;
                    return function () {
                        mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        let addr = address(false);
                        let total = 0;
                        let m, i;
                        for (m = rs, i = 0; m; m >>= 1, ++i) {
                            if (m & 1) {
                                gprs[i] = mmu.load32(addr & 0xFFFFFFFC);
                                addr += 4;
                                ++total;
                            }
                        }
                        mmu.waitMulti32(addr, total);
                        ++cpu.cycles;
                    };
                }
                /**
                 * LDMS
                 * @param rs
                 * @param address
                 * @param condOp
                 */
                constructLDMS(rs, address, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    const mmu = cpu.mmu;
                    return function () {
                        mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        let addr = address(false);
                        let total = 0;
                        const mode = cpu.mode;
                        cpu.switchMode(interfaces_ts_1.ARMMode.System);
                        let m, i;
                        for (m = rs, i = 0; m; m >>= 1, ++i) {
                            if (m & 1) {
                                gprs[i] = mmu.load32(addr & 0xFFFFFFFC);
                                addr += 4;
                                ++total;
                            }
                        }
                        cpu.switchMode(mode);
                        mmu.waitMulti32(addr, total);
                        ++cpu.cycles;
                    };
                }
                /**
                 *
                 * @param rd
                 * @param address
                 * @param condOp
                 */
                constructLDR(rd, address, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        const addr = address();
                        gprs[rd] = cpu.mmu.load32(addr);
                        cpu.mmu.wait32(addr);
                        ++cpu.cycles;
                    };
                }
                /**
                 *
                 * @param rd
                 * @param address
                 * @param condOp
                 */
                constructLDRB(rd, address, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        const addr = address();
                        gprs[rd] = cpu.mmu.loadU8(addr);
                        cpu.mmu.wait(addr);
                        ++cpu.cycles;
                    };
                }
                /**
                 *
                 * @param rd
                 * @param address
                 * @param condOp
                 */
                constructLDRH(rd, address, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        const addr = address();
                        gprs[rd] = cpu.mmu.loadU16(addr);
                        cpu.mmu.wait(addr);
                        ++cpu.cycles;
                    };
                }
                /**
                 *
                 * @param rd
                 * @param address
                 * @param condOp
                 */
                constructLDRSB(rd, address, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        const addr = address();
                        gprs[rd] = cpu.mmu.load8(addr);
                        cpu.mmu.wait(addr);
                        ++cpu.cycles;
                    };
                }
                /**
                 *
                 * @param rd
                 * @param address
                 * @param condOp
                 */
                constructLDRSH(rd, address, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        const addr = address();
                        gprs[rd] = cpu.mmu.load16(addr);
                        cpu.mmu.wait(addr);
                        ++cpu.cycles;
                    };
                }
                /**
                 * MLA
                 * @param rd
                 * @param rn
                 * @param rs
                 * @param rm
                 * @param condOp
                 */
                constructMLA(rd, rn, rs, rm, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        ++cpu.cycles;
                        cpu.mmu.waitMul(rs);
                        if ((gprs[rm] & 0xFFFF0000) && (gprs[rs] & 0xFFFF0000)) {
                            // Our data type is a double--we'll lose bits if we do it all at once!
                            const hi = ((gprs[rm] & 0xFFFF0000) * gprs[rs]) & 0xFFFFFFFF;
                            const lo = ((gprs[rm] & 0x0000FFFF) * gprs[rs]) & 0xFFFFFFFF;
                            gprs[rd] = (hi + lo + gprs[rn]) & 0xFFFFFFFF;
                        }
                        else {
                            gprs[rd] = gprs[rm] * gprs[rs] + gprs[rn];
                        }
                    };
                }
                /**
                 * MLAS
                 * @param rd
                 * @param rn
                 * @param rs
                 * @param rm
                 * @param condOp
                 */
                constructMLAS(rd, rn, rs, rm, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        ++cpu.cycles;
                        cpu.mmu.waitMul(rs);
                        if ((gprs[rm] & 0xFFFF0000) && (gprs[rs] & 0xFFFF0000)) {
                            // Our data type is a double--we'll lose bits if we do it all at once!
                            const hi = ((gprs[rm] & 0xFFFF0000) * gprs[rs]) & 0xFFFFFFFF;
                            const lo = ((gprs[rm] & 0x0000FFFF) * gprs[rs]) & 0xFFFFFFFF;
                            gprs[rd] = (hi + lo + gprs[rn]) & 0xFFFFFFFF;
                        }
                        else {
                            gprs[rd] = gprs[rm] * gprs[rs] + gprs[rn];
                        }
                        cpu.cpsrN = gprs[rd] >> 31;
                        cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF)) ? 1 : 0;
                    };
                }
                /**
                 * MOV
                 * @param rd
                 * @param rn
                 * @param shiftOp
                 * @param condOp
                 */
                constructMOV(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        gprs[rd] = cpu.shifterOperand;
                    };
                }
                /**
                 * MOVS
                 * @param rd
                 * @param rn
                 * @param shiftOp
                 * @param condOp
                 */
                constructMOVS(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        gprs[rd] = cpu.shifterOperand;
                        if (rd == cpu.PC && cpu.hasSPSR()) {
                            cpu.unpackCPSR(cpu.spsr);
                        }
                        else {
                            cpu.cpsrN = gprs[rd] >> 31;
                            cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF)) ? 1 : 0;
                            cpu.cpsrC = cpu.shifterCarryOut;
                        }
                    };
                }
                /**
                 * MRS
                 * @param rd
                 * @param r
                 * @param condOp
                 */
                constructMRS(rd, r, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        if (r) {
                            gprs[rd] = cpu.spsr;
                        }
                        else {
                            gprs[rd] = cpu.packCPSR();
                        }
                    };
                }
                /**
                 * MSR
                 * @param rm
                 * @param r
                 * @param instruction
                 * @param immediate
                 * @param condOp
                 */
                constructMSR(rm, r, instruction, immediate, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    const c = instruction & 0x00010000;
                    const f = instruction & 0x00080000;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        let operand;
                        if (instruction & 0x02000000) {
                            operand = immediate;
                        }
                        else {
                            operand = gprs[rm];
                        }
                        let mask = (c ? 0x000000FF : 0x00000000) |
                            //(x ? 0x0000FF00 : 0x00000000) | // Irrelevant on ARMv4T
                            //(s ? 0x00FF0000 : 0x00000000) | // Irrelevant on ARMv4T
                            (f ? 0xFF000000 : 0x00000000);
                        if (r) {
                            mask &= cpu.USER_MASK | cpu.PRIV_MASK | cpu.STATE_MASK;
                            cpu.spsr = (cpu.spsr & ~mask) | (operand & mask);
                        }
                        else {
                            if (mask & cpu.USER_MASK) {
                                cpu.cpsrN = operand >> 31;
                                cpu.cpsrZ = operand & 0x40000000;
                                cpu.cpsrC = operand & 0x20000000;
                                cpu.cpsrV = operand & 0x10000000;
                            }
                            if (cpu.mode != interfaces_ts_1.ARMMode.User && (mask & cpu.PRIV_MASK)) {
                                cpu.switchMode((operand & 0x0000000F) | 0x00000010);
                                cpu.cpsrI = operand & 0x00000080;
                                cpu.cpsrF = operand & 0x00000040;
                            }
                        }
                    };
                }
                constructMUL(rd, rs, rm, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        cpu.mmu.waitMul(gprs[rs]);
                        if ((gprs[rm] & 0xFFFF0000) && (gprs[rs] & 0xFFFF0000)) {
                            // Our data type is a double--we'll lose bits if we do it all at once!
                            var hi = ((gprs[rm] & 0xFFFF0000) * gprs[rs]) | 0;
                            var lo = ((gprs[rm] & 0x0000FFFF) * gprs[rs]) | 0;
                            gprs[rd] = hi + lo;
                        }
                        else {
                            gprs[rd] = gprs[rm] * gprs[rs];
                        }
                    };
                }
                constructMULS(rd, rs, rm, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        cpu.mmu.waitMul(gprs[rs]);
                        if ((gprs[rm] & 0xFFFF0000) && (gprs[rs] & 0xFFFF0000)) {
                            // Our data type is a double--we'll lose bits if we do it all at once!
                            var hi = ((gprs[rm] & 0xFFFF0000) * gprs[rs]) | 0;
                            var lo = ((gprs[rm] & 0x0000FFFF) * gprs[rs]) | 0;
                            gprs[rd] = hi + lo;
                        }
                        else {
                            gprs[rd] = gprs[rm] * gprs[rs];
                        }
                        cpu.cpsrN = gprs[rd] >> 31;
                        cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF)) ? 1 : 0;
                    };
                }
                /**
                 *
                 * @param rd
                 * @param rn
                 * @param shiftOp
                 * @param condOp
                 */
                constructMVN(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        gprs[rd] = ~cpu.shifterOperand;
                    };
                }
                constructMVNS(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        gprs[rd] = ~cpu.shifterOperand;
                        if (rd == cpu.PC && cpu.hasSPSR()) {
                            cpu.unpackCPSR(cpu.spsr);
                        }
                        else {
                            cpu.cpsrN = gprs[rd] >> 31;
                            cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF)) ? 1 : 0;
                            cpu.cpsrC = cpu.shifterCarryOut;
                        }
                    };
                }
                /**
                 *
                 * @param rd
                 * @param rn
                 * @param shiftOp
                 * @param condOp
                 */
                constructORR(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        gprs[rd] = gprs[rn] | cpu.shifterOperand;
                    };
                }
                /**
                 * ORRS
                 * @param rd
                 * @param rn
                 * @param shiftOp
                 * @param condOp
                 */
                constructORRS(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        gprs[rd] = gprs[rn] | cpu.shifterOperand;
                        if (rd == cpu.PC && cpu.hasSPSR()) {
                            cpu.unpackCPSR(cpu.spsr);
                        }
                        else {
                            cpu.cpsrN = gprs[rd] >> 31;
                            cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF)) ? 1 : 0;
                            cpu.cpsrC = cpu.shifterCarryOut;
                        }
                    };
                }
                /**
                 * RSB
                 * @param rd
                 * @param rn
                 * @param shiftOp
                 * @param condOp
                 */
                constructRSB(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        gprs[rd] = cpu.shifterOperand - gprs[rn];
                    };
                }
                ;
                /**
                 * RSBS
                 * @param rd
                 * @param rn
                 * @param shiftOp
                 * @param condOp
                 */
                constructRSBS(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        var d = cpu.shifterOperand - gprs[rn];
                        if (rd == cpu.PC && cpu.hasSPSR()) {
                            cpu.unpackCPSR(cpu.spsr);
                        }
                        else {
                            cpu.cpsrN = d >> 31;
                            cpu.cpsrZ = (!(d & 0xFFFFFFFF)) ? 1 : 0;
                            cpu.cpsrC = ((cpu.shifterOperand >>> 0) >= (gprs[rn] >>> 0)) ? 1 : 0;
                            cpu.cpsrV = ((cpu.shifterOperand >> 31) != (gprs[rn] >> 31) &&
                                (cpu.shifterOperand >> 31) != (d >> 31)) ? 1 : 0;
                        }
                        gprs[rd] = d;
                    };
                }
                /**
                 *
                 * @param rd
                 * @param rn
                 * @param shiftOp
                 * @param condOp
                 */
                constructRSC(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        const n = (gprs[rn] >>> 0) + (!cpu.cpsrC ? 1 : 0);
                        gprs[rd] = (cpu.shifterOperand >>> 0) - n;
                    };
                }
                constructRSCS(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        var n = (gprs[rn] >>> 0) + (!cpu.cpsrC ? 1 : 0);
                        var d = (cpu.shifterOperand >>> 0) - n;
                        if (rd == cpu.PC && cpu.hasSPSR()) {
                            cpu.unpackCPSR(cpu.spsr);
                        }
                        else {
                            cpu.cpsrN = d >> 31;
                            cpu.cpsrZ = (!(d & 0xFFFFFFFF)) ? 1 : 0;
                            cpu.cpsrC = ((cpu.shifterOperand >>> 0) >= (d >>> 0)) ? 1 : 0;
                            cpu.cpsrV = ((cpu.shifterOperand >> 31) != (n >> 31) &&
                                (cpu.shifterOperand >> 31) != (d >> 31)) ? 1 : 0;
                        }
                        gprs[rd] = d;
                    };
                }
                /**
                 *
                 * @param rd
                 * @param rn
                 * @param shiftOp
                 * @param condOp
                 */
                constructSBC(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        var shifterOperand = (cpu.shifterOperand >>> 0) + (!cpu.cpsrC ? 1 : 0);
                        gprs[rd] = (gprs[rn] >>> 0) - shifterOperand;
                    };
                }
                constructSBCS(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        var shifterOperand = (cpu.shifterOperand >>> 0) + (!cpu.cpsrC ? 1 : 0);
                        var d = (gprs[rn] >>> 0) - shifterOperand;
                        if (rd == cpu.PC && cpu.hasSPSR()) {
                            cpu.unpackCPSR(cpu.spsr);
                        }
                        else {
                            cpu.cpsrN = d >> 31;
                            cpu.cpsrZ = (!(d & 0xFFFFFFFF)) ? 1 : 0;
                            cpu.cpsrC = ((gprs[rn] >>> 0) >= (d >>> 0) ? 1 : 0);
                            cpu.cpsrV = ((gprs[rn] >> 31) != (shifterOperand >> 31) &&
                                (gprs[rn] >> 31) != (d >> 31) ? 1 : 0);
                        }
                        gprs[rd] = d;
                    };
                }
                constructSMLAL(rd, rn, rs, rm, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        cpu.cycles += 2;
                        cpu.mmu.waitMul(rs);
                        var hi = (gprs[rm] & 0xFFFF0000) * gprs[rs];
                        var lo = (gprs[rm] & 0x0000FFFF) * gprs[rs];
                        var carry = (gprs[rn] >>> 0) + hi + lo;
                        gprs[rn] = carry;
                        gprs[rd] += Math.floor(carry * constants_ts_1.SHIFT_32);
                    };
                }
                constructSMLALS(rd, rn, rs, rm, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        cpu.cycles += 2;
                        cpu.mmu.waitMul(rs);
                        var hi = (gprs[rm] & 0xFFFF0000) * gprs[rs];
                        var lo = (gprs[rm] & 0x0000FFFF) * gprs[rs];
                        var carry = (gprs[rn] >>> 0) + hi + lo;
                        gprs[rn] = carry;
                        gprs[rd] += Math.floor(carry * constants_ts_1.SHIFT_32);
                        cpu.cpsrN = gprs[rd] >> 31;
                        cpu.cpsrZ = (!((gprs[rd] & 0xFFFFFFFF) || (gprs[rn] & 0xFFFFFFFF))) ? 1 : 0;
                    };
                }
                ;
                /**
                 * SMULL
                 * @param rd
                 * @param rn
                 * @param rs
                 * @param rm
                 * @param condOp
                 */
                constructSMULL(rd, rn, rs, rm, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        ++cpu.cycles;
                        cpu.mmu.waitMul(gprs[rs]);
                        var hi = ((gprs[rm] & 0xFFFF0000) >> 0) * (gprs[rs] >> 0);
                        var lo = ((gprs[rm] & 0x0000FFFF) >> 0) * (gprs[rs] >> 0);
                        gprs[rn] = ((hi & 0xFFFFFFFF) + (lo & 0xFFFFFFFF)) & 0xFFFFFFFF;
                        gprs[rd] = Math.floor(hi * constants_ts_1.SHIFT_32 + lo * constants_ts_1.SHIFT_32);
                    };
                }
                /**
                 *
                 * @param rd
                 * @param rn
                 * @param rs
                 * @param rm
                 * @param condOp
                 */
                constructSMULLS(rd, rn, rs, rm, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        ++cpu.cycles;
                        cpu.mmu.waitMul(gprs[rs]);
                        var hi = ((gprs[rm] & 0xFFFF0000) >> 0) * (gprs[rs] >> 0);
                        var lo = ((gprs[rm] & 0x0000FFFF) >> 0) * (gprs[rs] >> 0);
                        gprs[rn] = ((hi & 0xFFFFFFFF) + (lo & 0xFFFFFFFF)) & 0xFFFFFFFF;
                        gprs[rd] = Math.floor(hi * constants_ts_1.SHIFT_32 + lo * constants_ts_1.SHIFT_32);
                        cpu.cpsrN = gprs[rd] >> 31;
                        cpu.cpsrZ = (!((gprs[rd] & 0xFFFFFFFF) || (gprs[rn] & 0xFFFFFFFF)) ? 1 : 0);
                    };
                }
                /**
                 * STM
                 * @param rs
                 * @param address
                 * @param condOp
                 */
                constructSTM(rs, address, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    const mmu = cpu.mmu;
                    return function () {
                        if (condOp && !condOp()) {
                            mmu.waitPrefetch32(gprs[cpu.PC]);
                            return;
                        }
                        mmu.wait32(gprs[cpu.PC]);
                        let addr = address(true);
                        let total = 0;
                        let m, i;
                        for (m = rs, i = 0; m; m >>= 1, ++i) {
                            if (m & 1) {
                                mmu.store32(addr, gprs[i]);
                                addr += 4;
                                ++total;
                            }
                        }
                        mmu.waitMulti32(addr, total);
                    };
                }
                /**
                 * STMS
                 * @param rs
                 * @param address
                 * @param condOp
                 */
                constructSTMS(rs, address, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    const mmu = cpu.mmu;
                    return function () {
                        if (condOp && !condOp()) {
                            mmu.waitPrefetch32(gprs[cpu.PC]);
                            return;
                        }
                        mmu.wait32(gprs[cpu.PC]);
                        const mode = cpu.mode;
                        let addr = address(true);
                        let total = 0;
                        let m, i;
                        cpu.switchMode(interfaces_ts_1.ARMMode.System);
                        for (m = rs, i = 0; m; m >>= 1, ++i) {
                            if (m & 1) {
                                mmu.store32(addr, gprs[i]);
                                addr += 4;
                                ++total;
                            }
                        }
                        cpu.switchMode(mode);
                        mmu.waitMulti32(addr, total);
                    };
                }
                /**
                 * STR
                 * @param rd
                 * @param address
                 * @param condOp
                 */
                constructSTR(rd, address, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        if (condOp && !condOp()) {
                            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                            return;
                        }
                        const addr = address();
                        cpu.mmu.store32(addr, gprs[rd]);
                        cpu.mmu.wait32(addr);
                        cpu.mmu.wait32(gprs[cpu.PC]);
                    };
                }
                /**
                 * STRB
                 * @param rd
                 * @param address
                 * @param condOp
                 */
                constructSTRB(rd, address, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        if (condOp && !condOp()) {
                            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                            return;
                        }
                        const addr = address();
                        cpu.mmu.store8(addr, gprs[rd]);
                        cpu.mmu.wait(addr);
                        cpu.mmu.wait32(gprs[cpu.PC]);
                    };
                }
                /**
                 *
                 * @param rd
                 * @param address
                 * @param condOp
                 */
                constructSTRH(rd, address, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        if (condOp && !condOp()) {
                            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                            return;
                        }
                        const addr = address();
                        cpu.mmu.store16(addr, gprs[rd]);
                        cpu.mmu.wait(addr);
                        cpu.mmu.wait32(gprs[cpu.PC]);
                    };
                }
                /**
                 * SUB
                 * @param rd
                 * @param rn
                 * @param shiftOp
                 * @param condOp
                 */
                constructSUB(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        gprs[rd] = gprs[rn] - cpu.shifterOperand;
                    };
                }
                /**
                 * SUBS
                 * @param rd
                 * @param rn
                 * @param shiftOp
                 * @param condOp
                 */
                constructSUBS(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        var d = gprs[rn] - cpu.shifterOperand;
                        if (rd == cpu.PC && cpu.hasSPSR()) {
                            cpu.unpackCPSR(cpu.spsr);
                        }
                        else {
                            cpu.cpsrN = d >> 31;
                            cpu.cpsrZ = !(d & 0xFFFFFFFF) ? 1 : 0;
                            cpu.cpsrC = (gprs[rn] >>> 0) >= (cpu.shifterOperand >>> 0) ? 1 : 0;
                            cpu.cpsrV = ((gprs[rn] >> 31) != (cpu.shifterOperand >> 31) &&
                                (gprs[rn] >> 31) != (d >> 31)) ? 1 : 0;
                        }
                        gprs[rd] = d;
                    };
                }
                /**
                 * SWI
                 * @param immediate
                 * @param condOp
                 */
                constructSWI(immediate, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        if (condOp && !condOp()) {
                            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                            return;
                        }
                        cpu.irq.swi32(immediate);
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                    };
                }
                /**
                 *
                 * @param rd
                 * @param rn
                 * @param rm
                 * @param condOp
                 */
                constructSWP(rd, rn, rm, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        cpu.mmu.wait32(gprs[rn]);
                        cpu.mmu.wait32(gprs[rn]);
                        var d = cpu.mmu.load32(gprs[rn]);
                        cpu.mmu.store32(gprs[rn], gprs[rm]);
                        gprs[rd] = d;
                        ++cpu.cycles;
                    };
                }
                /**
                 * SWPB
                 * @param rd
                 * @param rn
                 * @param rm
                 * @param condOp
                 */
                constructSWPB(rd, rn, rm, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        cpu.mmu.wait(gprs[rn]);
                        cpu.mmu.wait(gprs[rn]);
                        const d = cpu.mmu.load8(gprs[rn]);
                        cpu.mmu.store8(gprs[rn], gprs[rm]);
                        gprs[rd] = d;
                        ++cpu.cycles;
                    };
                }
                /**
                 *
                 * @param rd
                 * @param rn
                 * @param shiftOp
                 * @param condOp
                 */
                constructTEQ(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        const aluOut = gprs[rn] ^ cpu.shifterOperand;
                        cpu.cpsrN = aluOut >> 31;
                        cpu.cpsrZ = !(aluOut & 0xFFFFFFFF) ? 1 : 0;
                        cpu.cpsrC = cpu.shifterCarryOut;
                    };
                }
                /**
                 *
                 * @param rd
                 * @param rn
                 * @param shiftOp
                 * @param condOp
                 */
                constructTST(rd, rn, shiftOp, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        shiftOp();
                        const aluOut = gprs[rn] & cpu.shifterOperand;
                        cpu.cpsrN = aluOut >> 31;
                        cpu.cpsrZ = !(aluOut & 0xFFFFFFFF) ? 1 : 0;
                        cpu.cpsrC = cpu.shifterCarryOut;
                    };
                }
                /**
                 * UMLAL
                 * @param rd
                 * @param rn
                 * @param rs
                 * @param rm
                 * @param condOp
                 */
                constructUMLAL(rd, rn, rs, rm, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        cpu.cycles += 2;
                        cpu.mmu.waitMul(rs);
                        const hi = ((gprs[rm] & 0xFFFF0000) >>> 0) * (gprs[rs] >>> 0);
                        const lo = (gprs[rm] & 0x0000FFFF) * (gprs[rs] >>> 0);
                        const carry = (gprs[rn] >>> 0) + hi + lo;
                        gprs[rn] = carry;
                        gprs[rd] += carry * constants_ts_1.SHIFT_32;
                    };
                }
                /**
                 * UMLALS
                 * @param rd
                 * @param rn
                 * @param rs
                 * @param rm
                 * @param condOp
                 */
                constructUMLALS(rd, rn, rs, rm, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        cpu.cycles += 2;
                        cpu.mmu.waitMul(rs);
                        const hi = ((gprs[rm] & 0xFFFF0000) >>> 0) * (gprs[rs] >>> 0);
                        const lo = (gprs[rm] & 0x0000FFFF) * (gprs[rs] >>> 0);
                        const carry = (gprs[rn] >>> 0) + hi + lo;
                        gprs[rn] = carry;
                        gprs[rd] += carry * constants_ts_1.SHIFT_32;
                        cpu.cpsrN = gprs[rd] >> 31;
                        cpu.cpsrZ = !((gprs[rd] & 0xFFFFFFFF) || (gprs[rn] & 0xFFFFFFFF)) ? 1 : 0;
                    };
                }
                /**
                 * UMULL
                 * @param rd
                 * @param rn
                 * @param rs
                 * @param rm
                 * @param condOp
                 * @see https://developer.arm.com/docs/dui0801/j/a64-general-instructions/umull
                 */
                constructUMULL(rd, rn, rs, rm, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        ++cpu.cycles;
                        cpu.mmu.waitMul(gprs[rs]);
                        const hi = ((gprs[rm] & 0xFFFF0000) >>> 0) * (gprs[rs] >>> 0);
                        const lo = ((gprs[rm] & 0x0000FFFF) >>> 0) * (gprs[rs] >>> 0);
                        gprs[rn] = ((hi & 0xFFFFFFFF) + (lo & 0xFFFFFFFF)) & 0xFFFFFFFF;
                        gprs[rd] = ((hi + lo) * constants_ts_1.SHIFT_32) >>> 0;
                    };
                }
                /**
                 * UMULLS
                 * @param rd
                 * @param rn
                 * @param rs
                 * @param rm
                 * @param condOp
                 */
                constructUMULLS(rd, rn, rs, rm, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        if (condOp && !condOp()) {
                            return;
                        }
                        ++cpu.cycles;
                        cpu.mmu.waitMul(gprs[rs]);
                        const hi = ((gprs[rm] & 0xFFFF0000) >>> 0) * (gprs[rs] >>> 0);
                        const lo = ((gprs[rm] & 0x0000FFFF) >>> 0) * (gprs[rs] >>> 0);
                        gprs[rn] = ((hi & 0xFFFFFFFF) + (lo & 0xFFFFFFFF)) & 0xFFFFFFFF;
                        gprs[rd] = ((hi + lo) * constants_ts_1.SHIFT_32) >>> 0;
                        cpu.cpsrN = gprs[rd] >> 31;
                        cpu.cpsrZ = !((gprs[rd] & 0xFFFFFFFF) || (gprs[rn] & 0xFFFFFFFF)) ? 1 : 0;
                    };
                }
            };
            exports_3("default", ARMCoreArm);
        }
    };
});
System.register("core/ARMCoreThumb", [], function (exports_4, context_4) {
    "use strict";
    var ARMCoreThumb;
    var __moduleName = context_4 && context_4.id;
    return {
        setters: [],
        execute: function () {
            /**
             * ARM Thumb 指令集
             */
            ARMCoreThumb = class ARMCoreThumb {
                constructor(cpu) {
                    this.cpu = cpu;
                }
                /**
                 * ADC
                 * @param rd
                 * @param rm
                 */
                constructADC(rd, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        const m = (gprs[rm] >>> 0) + (!!cpu.cpsrC ? 1 : 0);
                        const oldD = gprs[rd];
                        const d = (oldD >>> 0) + m;
                        const oldDn = oldD >> 31;
                        const dn = d >> 31;
                        const mn = m >> 31;
                        cpu.cpsrN = dn;
                        cpu.cpsrZ = (!(d & 0xFFFFFFFF)) ? 1 : 0;
                        cpu.cpsrC = (d > 0xFFFFFFFF) ? 1 : 0;
                        cpu.cpsrV = (oldDn == mn && oldDn != dn && mn != dn) ? 1 : 0;
                        gprs[rd] = d;
                    };
                }
                /**
                 * ADD1
                 * @param rd
                 * @param rn
                 * @param immediate
                 */
                constructADD1(rd, rn, immediate) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        const d = (gprs[rn] >>> 0) + immediate;
                        cpu.cpsrN = d >> 31;
                        cpu.cpsrZ = (!(d & 0xFFFFFFFF)) ? 1 : 0;
                        cpu.cpsrC = (d > 0xFFFFFFFF) ? 1 : 0;
                        cpu.cpsrV = (!(gprs[rn] >> 31) && ((gprs[rn] >> 31 ^ d) >> 31) && (d >> 31)) ? 1 : 0;
                        gprs[rd] = d;
                    };
                }
                /**
                 * ADD2
                 * @param rn
                 * @param immediate
                 */
                constructADD2(rn, immediate) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        const d = (gprs[rn] >>> 0) + immediate;
                        cpu.cpsrN = d >> 31;
                        cpu.cpsrZ = (!(d & 0xFFFFFFFF)) ? 1 : 0;
                        cpu.cpsrC = (d > 0xFFFFFFFF) ? 1 : 0;
                        cpu.cpsrV = (!(gprs[rn] >> 31) && ((gprs[rn] ^ d) >> 31) && ((immediate ^ d) >> 31)) ? 1 : 0;
                        gprs[rn] = d;
                    };
                }
                /**
                 * ADD3
                 * @param rd
                 * @param rn
                 * @param rm
                 */
                constructADD3(rd, rn, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        const d = (gprs[rn] >>> 0) + (gprs[rm] >>> 0);
                        cpu.cpsrN = d >> 31;
                        cpu.cpsrZ = (!(d & 0xFFFFFFFF)) ? 1 : 0;
                        cpu.cpsrC = (d > 0xFFFFFFFF) ? 1 : 0;
                        cpu.cpsrV = (!((gprs[rn] ^ gprs[rm]) >> 31) && ((gprs[rn] ^ d) >> 31) && ((gprs[rm] ^ d) >> 31)) ? 1 : 0;
                        gprs[rd] = d;
                    };
                }
                /**
                 * ADD4
                 * @param rd
                 * @param rm
                 */
                constructADD4(rd, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        gprs[rd] += gprs[rm];
                    };
                }
                /**
                 * ADD5
                 * @param rd
                 * @param immediate
                 */
                constructADD5(rd, immediate) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        gprs[rd] = (gprs[cpu.PC] & 0xFFFFFFFC) + immediate;
                    };
                }
                /**
                 * ADD6
                 * @param rd
                 * @param immediate
                 */
                constructADD6(rd, immediate) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        gprs[rd] = gprs[cpu.SP] + immediate;
                    };
                }
                /**
                 * ADD7
                 * @param immediate
                 */
                constructADD7(immediate) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        gprs[cpu.SP] += immediate;
                    };
                }
                /**
                 * AND
                 * @param rd
                 * @param rm
                 */
                constructAND(rd, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        gprs[rd] = gprs[rd] & gprs[rm];
                        cpu.cpsrN = gprs[rd] >> 31;
                        cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF)) ? 1 : 0;
                    };
                }
                /**
                 * ASR1
                 * @param rd
                 * @param rm
                 * @param immediate
                 */
                constructASR1(rd, rm, immediate) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        if (immediate == 0) {
                            cpu.cpsrC = gprs[rm] >> 31;
                            if (cpu.cpsrC) {
                                gprs[rd] = 0xFFFFFFFF;
                            }
                            else {
                                gprs[rd] = 0;
                            }
                        }
                        else {
                            cpu.cpsrC = gprs[rm] & (1 << (immediate - 1));
                            gprs[rd] = gprs[rm] >> immediate;
                        }
                        cpu.cpsrN = gprs[rd] >> 31;
                        cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF)) ? 1 : 0;
                    };
                }
                /**
                 * ASR2
                 * @param rd
                 * @param rm
                 */
                constructASR2(rd, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        var rs = gprs[rm] & 0xFF;
                        if (rs) {
                            if (rs < 32) {
                                cpu.cpsrC = gprs[rd] & (1 << (rs - 1));
                                gprs[rd] >>= rs;
                            }
                            else {
                                cpu.cpsrC = gprs[rd] >> 31;
                                if (cpu.cpsrC) {
                                    gprs[rd] = 0xFFFFFFFF;
                                }
                                else {
                                    gprs[rd] = 0;
                                }
                            }
                        }
                        cpu.cpsrN = gprs[rd] >> 31;
                        cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF)) ? 1 : 0;
                    };
                }
                /**
                 * B1
                 * @param immediate
                 * @param condOp
                 */
                constructB1(immediate, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        if (condOp()) {
                            gprs[cpu.PC] += immediate;
                        }
                    };
                }
                /**
                 * B2
                 * @param immediate
                 */
                constructB2(immediate) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        gprs[cpu.PC] += immediate;
                    };
                }
                /**
                 * BIC
                 * @param rd
                 * @param rm
                 */
                constructBIC(rd, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        gprs[rd] = gprs[rd] & ~gprs[rm];
                        cpu.cpsrN = gprs[rd] >> 31;
                        cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF)) ? 1 : 0;
                    };
                }
                /**
                 * BL1
                 * @param immediate
                 */
                constructBL1(immediate) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        gprs[cpu.LR] = gprs[cpu.PC] + immediate;
                    };
                }
                /**
                 * BL2
                 * @param immediate
                 */
                constructBL2(immediate) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        var pc = gprs[cpu.PC];
                        gprs[cpu.PC] = gprs[cpu.LR] + (immediate << 1);
                        gprs[cpu.LR] = pc - 1;
                    };
                }
                /**
                 * BX
                 * @param rd
                 * @param rm
                 */
                constructBX(rd, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        cpu.switchExecMode(gprs[rm] & 0x00000001);
                        let misalign = 0;
                        if (rm == 15) {
                            misalign = gprs[rm] & 0x00000002;
                        }
                        gprs[cpu.PC] = gprs[rm] & 0xFFFFFFFE - misalign;
                    };
                }
                /**
                 * CMN
                 * @param rd
                 * @param rm
                 */
                constructCMN(rd, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        var aluOut = (gprs[rd] >>> 0) + (gprs[rm] >>> 0);
                        cpu.cpsrN = aluOut >> 31;
                        cpu.cpsrZ = (!(aluOut & 0xFFFFFFFF)) ? 1 : 0;
                        cpu.cpsrC = (aluOut > 0xFFFFFFFF) ? 1 : 0;
                        cpu.cpsrV = ((gprs[rd] >> 31) == (gprs[rm] >> 31) &&
                            (gprs[rd] >> 31) != (aluOut >> 31) &&
                            (gprs[rm] >> 31) != (aluOut >> 31)) ? 1 : 0;
                    };
                }
                /**
                 * CMP
                 * @param rn
                 * @param immediate
                 */
                constructCMP1(rn, immediate) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        var aluOut = gprs[rn] - immediate;
                        cpu.cpsrN = aluOut >> 31;
                        cpu.cpsrZ = (!(aluOut & 0xFFFFFFFF)) ? 1 : 0;
                        cpu.cpsrC = ((gprs[rn] >>> 0) >= immediate) ? 1 : 0;
                        cpu.cpsrV = (gprs[rn] >> 31) && ((gprs[rn] ^ aluOut) >> 31);
                    };
                }
                /**
                 * CMP2
                 * @param rd
                 * @param rm
                 */
                constructCMP2(rd, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        const d = gprs[rd];
                        const m = gprs[rm];
                        const aluOut = d - m;
                        const an = aluOut >> 31;
                        const dn = d >> 31;
                        cpu.cpsrN = an;
                        cpu.cpsrZ = (!(aluOut & 0xFFFFFFFF)) ? 1 : 0;
                        cpu.cpsrC = ((d >>> 0) >= (m >>> 0)) ? 1 : 0;
                        cpu.cpsrV = (dn != (m >> 31) && dn != an) ? 1 : 0;
                    };
                }
                /**
                 * CMP3
                 * @param rd
                 * @param rm
                 */
                constructCMP3(rd, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        const aluOut = gprs[rd] - gprs[rm];
                        cpu.cpsrN = aluOut >> 31;
                        cpu.cpsrZ = (!(aluOut & 0xFFFFFFFF)) ? 1 : 0;
                        cpu.cpsrC = ((gprs[rd] >>> 0) >= (gprs[rm] >>> 0)) ? 1 : 0;
                        cpu.cpsrV = ((gprs[rd] ^ gprs[rm]) >> 31) && ((gprs[rd] ^ aluOut) >> 31);
                    };
                }
                /**
                 * EOR
                 * @param rd
                 * @param rm
                 */
                constructEOR(rd, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        gprs[rd] = gprs[rd] ^ gprs[rm];
                        cpu.cpsrN = gprs[rd] >> 31;
                        cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF)) ? 1 : 0;
                    };
                }
                /**
                 * DMIA
                 * @param rn
                 * @param rs
                 */
                constructLDMIA(rn, rs) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        let address = gprs[rn];
                        let total = 0;
                        let m, i;
                        for (m = 0x01, i = 0; i < 8; m <<= 1, ++i) {
                            if (rs & m) {
                                gprs[i] = cpu.mmu.load32(address);
                                address += 4;
                                ++total;
                            }
                        }
                        cpu.mmu.waitMulti32(address, total);
                        if (!((1 << rn) & rs)) {
                            gprs[rn] = address;
                        }
                    };
                }
                /**
                 * LDR1
                 * @param rd
                 * @param rn
                 * @param immediate
                 */
                constructLDR1(rd, rn, immediate) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        const n = gprs[rn] + immediate;
                        gprs[rd] = cpu.mmu.load32(n);
                        cpu.mmu.wait32(n);
                        ++cpu.cycles;
                    };
                }
                /**
                 * LDR2
                 * @param rd
                 * @param rn
                 * @param rm
                 */
                constructLDR2(rd, rn, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        gprs[rd] = cpu.mmu.load32(gprs[rn] + gprs[rm]);
                        cpu.mmu.wait32(gprs[rn] + gprs[rm]);
                        ++cpu.cycles;
                    };
                }
                /**
                 * LDR3
                 * @param rd
                 * @param immediate
                 */
                constructLDR3(rd, immediate) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        gprs[rd] = cpu.mmu.load32((gprs[cpu.PC] & 0xFFFFFFFC) + immediate);
                        cpu.mmu.wait32(gprs[cpu.PC]);
                        ++cpu.cycles;
                    };
                }
                /**
                 * LDR4
                 * @param rd
                 * @param immediate
                 */
                constructLDR4(rd, immediate) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        gprs[rd] = cpu.mmu.load32(gprs[cpu.SP] + immediate);
                        cpu.mmu.wait32(gprs[cpu.SP] + immediate);
                        ++cpu.cycles;
                    };
                }
                /**
                 * LDRB1
                 * @param rd
                 * @param rn
                 * @param immediate
                 */
                constructLDRB1(rd, rn, immediate) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        const n = gprs[rn] + immediate;
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        gprs[rd] = cpu.mmu.loadU8(n);
                        cpu.mmu.wait(n);
                        ++cpu.cycles;
                    };
                }
                /**
                 * LDRB2
                 * @param rd
                 * @param rn
                 * @param rm
                 */
                constructLDRB2(rd, rn, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        gprs[rd] = cpu.mmu.loadU8(gprs[rn] + gprs[rm]);
                        cpu.mmu.wait(gprs[rn] + gprs[rm]);
                        ++cpu.cycles;
                    };
                }
                /**
                 * LDRH1
                 * @param rd
                 * @param rn
                 * @param immediate
                 */
                constructLDRH1(rd, rn, immediate) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        const n = gprs[rn] + immediate;
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        gprs[rd] = cpu.mmu.loadU16(n);
                        cpu.mmu.wait(n);
                        ++cpu.cycles;
                    };
                }
                /**
                 * LDRH2
                 * @param rd
                 * @param rn
                 * @param rm
                 */
                constructLDRH2(rd, rn, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        gprs[rd] = cpu.mmu.loadU16(gprs[rn] + gprs[rm]);
                        cpu.mmu.wait(gprs[rn] + gprs[rm]);
                        ++cpu.cycles;
                    };
                }
                /**
                 * LDRSB
                 * @param rd
                 * @param rn
                 * @param rm
                 */
                constructLDRSB(rd, rn, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        gprs[rd] = cpu.mmu.load8(gprs[rn] + gprs[rm]);
                        cpu.mmu.wait(gprs[rn] + gprs[rm]);
                        ++cpu.cycles;
                    };
                }
                /**
                 * LDRSH
                 * @param rd
                 * @param rn
                 * @param rm
                 */
                constructLDRSH(rd, rn, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        gprs[rd] = cpu.mmu.load16(gprs[rn] + gprs[rm]);
                        cpu.mmu.wait(gprs[rn] + gprs[rm]);
                        ++cpu.cycles;
                    };
                }
                /**
                 * LSL1
                 * @param rd
                 * @param rm
                 * @param immediate
                 */
                constructLSL1(rd, rm, immediate) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        if (immediate == 0) {
                            gprs[rd] = gprs[rm];
                        }
                        else {
                            cpu.cpsrC = gprs[rm] & (1 << (32 - immediate));
                            gprs[rd] = gprs[rm] << immediate;
                        }
                        cpu.cpsrN = gprs[rd] >> 31;
                        cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF)) ? 1 : 0;
                    };
                }
                /**
                 * LSL2
                 * @param rd
                 * @param rm
                 */
                constructLSL2(rd, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        const rs = gprs[rm] & 0xFF;
                        if (rs) {
                            if (rs < 32) {
                                cpu.cpsrC = gprs[rd] & (1 << (32 - rs));
                                gprs[rd] <<= rs;
                            }
                            else {
                                if (rs > 32) {
                                    cpu.cpsrC = 0;
                                }
                                else {
                                    cpu.cpsrC = gprs[rd] & 0x00000001;
                                }
                                gprs[rd] = 0;
                            }
                        }
                        cpu.cpsrN = gprs[rd] >> 31;
                        cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF)) ? 1 : 0;
                    };
                }
                /**
                 * LSR1
                 * @param rd
                 * @param rm
                 * @param immediate
                 */
                constructLSR1(rd, rm, immediate) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        if (immediate == 0) {
                            cpu.cpsrC = gprs[rm] >> 31;
                            gprs[rd] = 0;
                        }
                        else {
                            cpu.cpsrC = gprs[rm] & (1 << (immediate - 1));
                            gprs[rd] = gprs[rm] >>> immediate;
                        }
                        cpu.cpsrN = 0;
                        cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF)) ? 1 : 0;
                    };
                }
                /**
                 * LSR2
                 * @param rd
                 * @param rm
                 */
                constructLSR2(rd, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        const rs = gprs[rm] & 0xFF;
                        if (rs) {
                            if (rs < 32) {
                                cpu.cpsrC = gprs[rd] & (1 << (rs - 1));
                                gprs[rd] >>>= rs;
                            }
                            else {
                                if (rs > 32) {
                                    cpu.cpsrC = 0;
                                }
                                else {
                                    cpu.cpsrC = gprs[rd] >> 31;
                                }
                                gprs[rd] = 0;
                            }
                        }
                        cpu.cpsrN = gprs[rd] >> 31;
                        cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF)) ? 1 : 0;
                    };
                }
                ;
                /**
                 * MOV1
                 * @param rn
                 * @param immediate
                 */
                constructMOV1(rn, immediate) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        gprs[rn] = immediate;
                        cpu.cpsrN = immediate >> 31;
                        cpu.cpsrZ = (!(immediate & 0xFFFFFFFF)) ? 1 : 0;
                    };
                }
                /**
                 * MOV2
                 * @param rd
                 * @param rn
                 * @param rm
                 */
                constructMOV2(rd, rn, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        const d = gprs[rn];
                        cpu.cpsrN = d >> 31;
                        cpu.cpsrZ = (!(d & 0xFFFFFFFF)) ? 1 : 0;
                        cpu.cpsrC = 0;
                        cpu.cpsrV = 0;
                        gprs[rd] = d;
                    };
                }
                /**
                 * MOV3
                 * @param rd
                 * @param rm
                 */
                constructMOV3(rd, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        gprs[rd] = gprs[rm];
                    };
                }
                /**
                 * MUL
                 * @param rd
                 * @param rm
                 */
                constructMUL(rd, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        cpu.mmu.waitMul(gprs[rm]);
                        if ((gprs[rm] & 0xFFFF0000) && (gprs[rd] & 0xFFFF0000)) {
                            // Our data type is a double--we'll lose bits if we do it all at once!
                            const hi = ((gprs[rd] & 0xFFFF0000) * gprs[rm]) & 0xFFFFFFFF;
                            const lo = ((gprs[rd] & 0x0000FFFF) * gprs[rm]) & 0xFFFFFFFF;
                            gprs[rd] = (hi + lo) & 0xFFFFFFFF;
                        }
                        else {
                            gprs[rd] *= gprs[rm];
                        }
                        cpu.cpsrN = gprs[rd] >> 31;
                        cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF)) ? 1 : 0;
                    };
                }
                /**
                 * MVN
                 * @param rd
                 * @param rm
                 */
                constructMVN(rd, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        gprs[rd] = ~gprs[rm];
                        cpu.cpsrN = gprs[rd] >> 31;
                        cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF)) ? 1 : 0;
                    };
                }
                /**
                 * NEG
                 * @param rd
                 * @param rm
                 */
                constructNEG(rd, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        const d = -gprs[rm];
                        cpu.cpsrN = d >> 31;
                        cpu.cpsrZ = (!(d & 0xFFFFFFFF)) ? 1 : 0;
                        cpu.cpsrC = (0 >= (d >>> 0)) ? 1 : 0;
                        cpu.cpsrV = (gprs[rm] >> 31) && (d >> 31);
                        gprs[rd] = d;
                    };
                }
                /**
                 * ORR
                 * @param rd
                 * @param rm
                 */
                constructORR(rd, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        gprs[rd] = gprs[rd] | gprs[rm];
                        cpu.cpsrN = gprs[rd] >> 31;
                        cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF)) ? 1 : 0;
                    };
                }
                ;
                /**
                 * POP
                 * @param rs
                 * @param r
                 */
                constructPOP(rs, r) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        ++cpu.cycles;
                        let address = gprs[cpu.SP];
                        let total = 0;
                        let m, i;
                        for (m = 0x01, i = 0; i < 8; m <<= 1, ++i) {
                            if (rs & m) {
                                cpu.mmu.waitSeq32(address);
                                gprs[i] = cpu.mmu.load32(address);
                                address += 4;
                                ++total;
                            }
                        }
                        if (r) {
                            gprs[cpu.PC] = cpu.mmu.load32(address) & 0xFFFFFFFE;
                            address += 4;
                            ++total;
                        }
                        cpu.mmu.waitMulti32(address, total);
                        gprs[cpu.SP] = address;
                    };
                }
                /**
                 * PUSH
                 * @param rs
                 * @param r
                 */
                constructPUSH(rs, r) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        let address = gprs[cpu.SP] - 4;
                        let total = 0;
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        if (r) {
                            cpu.mmu.store32(address, gprs[cpu.LR]);
                            address -= 4;
                            ++total;
                        }
                        let m, i;
                        for (m = 0x80, i = 7; m; m >>= 1, --i) {
                            if (rs & m) {
                                cpu.mmu.store32(address, gprs[i]);
                                address -= 4;
                                ++total;
                                break;
                            }
                        }
                        for (m >>= 1, --i; m; m >>= 1, --i) {
                            if (rs & m) {
                                cpu.mmu.store32(address, gprs[i]);
                                address -= 4;
                                ++total;
                            }
                        }
                        cpu.mmu.waitMulti32(address, total);
                        gprs[cpu.SP] = address + 4;
                    };
                }
                /**
                 * ROR
                 * @param rd
                 * @param rm
                 */
                constructROR(rd, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        var rs = gprs[rm] & 0xFF;
                        if (rs) {
                            var r4 = rs & 0x1F;
                            if (r4 > 0) {
                                cpu.cpsrC = gprs[rd] & (1 << (r4 - 1));
                                gprs[rd] = (gprs[rd] >>> r4) | (gprs[rd] << (32 - r4));
                            }
                            else {
                                cpu.cpsrC = gprs[rd] >> 31;
                            }
                        }
                        cpu.cpsrN = gprs[rd] >> 31;
                        cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF)) ? 1 : 0;
                    };
                }
                /**
                 * SBC
                 * @param rd
                 * @param rm
                 */
                constructSBC(rd, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        const m = (gprs[rm] >>> 0) + (cpu.cpsrC > 0 ? 1 : 0);
                        const d = (gprs[rd] >>> 0) - m;
                        cpu.cpsrN = d >> 31;
                        cpu.cpsrZ = (!(d & 0xFFFFFFFF)) ? 1 : 0;
                        cpu.cpsrC = ((gprs[rd] >>> 0) >= (d >>> 0)) ? 1 : 0;
                        cpu.cpsrV = ((gprs[rd] ^ m) >> 31) && ((gprs[rd] ^ d) >> 31);
                        gprs[rd] = d;
                    };
                }
                /**
                 * STMIA
                 * @param rn
                 * @param rs
                 */
                constructSTMIA(rn, rs) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.wait(gprs[cpu.PC]);
                        let address = gprs[rn];
                        let total = 0;
                        let m, i;
                        for (m = 0x01, i = 0; i < 8; m <<= 1, ++i) {
                            if (rs & m) {
                                cpu.mmu.store32(address, gprs[i]);
                                address += 4;
                                ++total;
                                break;
                            }
                        }
                        for (m <<= 1, ++i; i < 8; m <<= 1, ++i) {
                            if (rs & m) {
                                cpu.mmu.store32(address, gprs[i]);
                                address += 4;
                                ++total;
                            }
                        }
                        cpu.mmu.waitMulti32(address, total);
                        gprs[rn] = address;
                    };
                }
                /**
                 * STR1
                 * @param rd
                 * @param rn
                 * @param immediate
                 */
                constructSTR1(rd, rn, immediate) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        var n = gprs[rn] + immediate;
                        cpu.mmu.store32(n, gprs[rd]);
                        cpu.mmu.wait(gprs[cpu.PC]);
                        cpu.mmu.wait32(n);
                    };
                }
                /**
                 * STR2
                 * @param rd
                 * @param rn
                 * @param rm
                 */
                constructSTR2(rd, rn, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.store32(gprs[rn] + gprs[rm], gprs[rd]);
                        cpu.mmu.wait(gprs[cpu.PC]);
                        cpu.mmu.wait32(gprs[rn] + gprs[rm]);
                    };
                }
                /**
                 * STR3
                 * @param rd
                 * @param immediate
                 */
                constructSTR3(rd, immediate) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.store32(gprs[cpu.SP] + immediate, gprs[rd]);
                        cpu.mmu.wait(gprs[cpu.PC]);
                        cpu.mmu.wait32(gprs[cpu.SP] + immediate);
                    };
                }
                /**
                 *
                 * @param rd
                 * @param rn
                 * @param immediate
                 */
                constructSTRB1(rd, rn, immediate) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        var n = gprs[rn] + immediate;
                        cpu.mmu.store8(n, gprs[rd]);
                        cpu.mmu.wait(gprs[cpu.PC]);
                        cpu.mmu.wait(n);
                    };
                }
                /**
                 *
                 * @param rd
                 * @param rn
                 * @param rm
                 */
                constructSTRB2(rd, rn, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.store8(gprs[rn] + gprs[rm], gprs[rd]);
                        cpu.mmu.wait(gprs[cpu.PC]);
                        cpu.mmu.wait(gprs[rn] + gprs[rm]);
                    };
                }
                /**
                 *
                 * @param rd
                 * @param rn
                 * @param immediate
                 */
                constructSTRH1(rd, rn, immediate) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        const n = gprs[rn] + immediate;
                        cpu.mmu.store16(n, gprs[rd]);
                        cpu.mmu.wait(gprs[cpu.PC]);
                        cpu.mmu.wait(n);
                    };
                }
                /**
                 *
                 * @param rd
                 * @param rn
                 * @param rm
                 */
                constructSTRH2(rd, rn, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.store16(gprs[rn] + gprs[rm], gprs[rd]);
                        cpu.mmu.wait(gprs[cpu.PC]);
                        cpu.mmu.wait(gprs[rn] + gprs[rm]);
                    };
                }
                /**
                 *
                 * @param rd
                 * @param rn
                 * @param immediate
                 */
                constructSUB1(rd, rn, immediate) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        const d = gprs[rn] - immediate;
                        cpu.cpsrN = d >> 31;
                        cpu.cpsrZ = (!(d & 0xFFFFFFFF)) ? 1 : 0;
                        cpu.cpsrC = ((gprs[rn] >>> 0) >= immediate) ? 1 : 0;
                        cpu.cpsrV = (gprs[rn] >> 31) && ((gprs[rn] ^ d) >> 31);
                        gprs[rd] = d;
                    };
                }
                /**
                 *
                 * @param rn
                 * @param immediate
                 */
                constructSUB2(rn, immediate) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        var d = gprs[rn] - immediate;
                        cpu.cpsrN = d >> 31;
                        cpu.cpsrZ = (!(d & 0xFFFFFFFF)) ? 1 : 0;
                        cpu.cpsrC = ((gprs[rn] >>> 0) >= immediate) ? 1 : 0;
                        cpu.cpsrV = (gprs[rn] >> 31) && ((gprs[rn] ^ d) >> 31);
                        gprs[rn] = d;
                    };
                }
                /**
                 *
                 * @param rd
                 * @param rn
                 * @param rm
                 */
                constructSUB3(rd, rn, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        const d = gprs[rn] - gprs[rm];
                        cpu.cpsrN = d >> 31;
                        cpu.cpsrZ = (!(d & 0xFFFFFFFF)) ? 1 : 0;
                        cpu.cpsrC = ((gprs[rn] >>> 0) >= (gprs[rm] >>> 0)) ? 1 : 0;
                        cpu.cpsrV = ((gprs[rn] >> 31) != (gprs[rm] >> 31) &&
                            (gprs[rn] >> 31) != (d >> 31)) ? 1 : 0;
                        gprs[rd] = d;
                    };
                }
                /**
                 * SWI
                 * @param immediate
                 */
                constructSWI(immediate) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.irq.swi(immediate);
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                    };
                }
                /**
                 *
                 * @param rd
                 * @param rm
                 */
                constructTST(rd, rm) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        cpu.mmu.waitPrefetch(gprs[cpu.PC]);
                        var aluOut = gprs[rd] & gprs[rm];
                        cpu.cpsrN = aluOut >> 31;
                        cpu.cpsrZ = (!(aluOut & 0xFFFFFFFF)) ? 1 : 0;
                    };
                }
            };
            exports_4("default", ARMCoreThumb);
        }
    };
});
System.register("core/ARMCore", ["interfaces", "core/ARMCoreArm", "core/ARMCoreThumb"], function (exports_5, context_5) {
    "use strict";
    var interfaces_ts_2, ARMCoreArm_ts_1, ARMCoreThumb_ts_1, BaseAddress, ARMCore;
    var __moduleName = context_5 && context_5.id;
    return {
        setters: [
            function (interfaces_ts_2_1) {
                interfaces_ts_2 = interfaces_ts_2_1;
            },
            function (ARMCoreArm_ts_1_1) {
                ARMCoreArm_ts_1 = ARMCoreArm_ts_1_1;
            },
            function (ARMCoreThumb_ts_1_1) {
                ARMCoreThumb_ts_1 = ARMCoreThumb_ts_1_1;
            }
        ],
        execute: function () {
            (function (BaseAddress) {
                BaseAddress[BaseAddress["RESET"] = 0] = "RESET";
                BaseAddress[BaseAddress["UNDEF"] = 4] = "UNDEF";
                BaseAddress[BaseAddress["SWI"] = 8] = "SWI";
                BaseAddress[BaseAddress["PABT"] = 12] = "PABT";
                BaseAddress[BaseAddress["DABT"] = 16] = "DABT";
                BaseAddress[BaseAddress["IRQ"] = 24] = "IRQ";
                BaseAddress[BaseAddress["FIQ"] = 28] = "FIQ";
            })(BaseAddress || (BaseAddress = {}));
            ARMCore = /** @class */ (() => {
                /**
                 * ARM 核心
                 */
                class ARMCore {
                    constructor() {
                        this.SP = 13;
                        this.LR = 14;
                        this.PC = 15;
                        this.page = null;
                        this.conds = [];
                        this.pageMask = 0;
                        this.loadInstruction = this.loadInstructionArm;
                        this.UNALLOC_MASK = 0x0FFFFF00;
                        this.USER_MASK = 0xF0000000;
                        this.PRIV_MASK = 0x000000CF; // This is out of spec, but it seems to be what's done in other implementations
                        this.STATE_MASK = 0x00000020;
                        // 0 ~ 15
                        this.gprs = new Int32Array(16);
                        this.execMode = interfaces_ts_2.OpExecMode.ARM;
                        this.instructionWidth = 0;
                        this.mode = interfaces_ts_2.ARMMode.System;
                        this.cpsrI = 0;
                        this.cpsrF = 0;
                        this.cpsrV = 0;
                        this.cpsrC = 0;
                        this.cpsrZ = 0;
                        this.cpsrN = 0;
                        this.spsr = 0;
                        this.bankedRegisters = [];
                        this.cycles = 0;
                        this.shifterOperand = 0;
                        this.shifterCarryOut = 0;
                        this.pageId = 0;
                        this.pageRegion = 0;
                        this.bankedSPSRs = new Int32Array();
                        this.instruction = null;
                        this.conditionPassed = false;
                        this.MODE_USER = 0x10;
                        this.MODE_FIQ = 0x11;
                        this.MODE_IRQ = 0x12;
                        this.MODE_SUPERVISOR = 0x13;
                        this.MODE_ABORT = 0x17;
                        this.MODE_UNDEFINED = 0x1B;
                        this.MODE_SYSTEM = 0x1F;
                        this.armCompiler = new ARMCoreArm_ts_1.default(this);
                        this.thumbCompiler = new ARMCoreThumb_ts_1.default(this);
                        this.generateConds();
                    }
                    /**
                     *
                     * @param startOffset
                     */
                    resetCPU(startOffset) {
                        for (var i = 0; i < this.PC; ++i) {
                            this.gprs[i] = 0;
                        }
                        this.gprs[this.PC] = startOffset + ARMCore.WORD_SIZE_ARM;
                        this.loadInstruction = this.loadInstructionArm;
                        this.execMode = interfaces_ts_2.OpExecMode.ARM;
                        this.instructionWidth = ARMCore.WORD_SIZE_ARM;
                        this.mode = interfaces_ts_2.ARMMode.System;
                        this.cpsrI = 0;
                        this.cpsrF = 0;
                        this.cpsrV = 0;
                        this.cpsrC = 0;
                        this.cpsrZ = 0;
                        this.cpsrN = 0;
                        this.bankedRegisters = [
                            new Int32Array(7),
                            new Int32Array(7),
                            new Int32Array(2),
                            new Int32Array(2),
                            new Int32Array(2),
                            new Int32Array(2)
                        ];
                        this.spsr = 0;
                        this.bankedSPSRs = new Int32Array(6);
                        this.cycles = 0;
                        this.shifterOperand = 0;
                        this.shifterCarryOut = 0;
                        this.page = null;
                        this.pageId = 0;
                        this.pageRegion = -1;
                        this.instruction = null;
                        this.irq.clear();
                    }
                    /**
                     * 執行指令
                     */
                    step() {
                        const gprs = this.gprs;
                        const mmu = this.mmu;
                        let instruction = this.instruction;
                        if (!instruction) {
                            this.instruction = this.loadInstruction(gprs[this.PC] - this.instructionWidth);
                            instruction = this.instruction;
                        }
                        gprs[this.PC] += this.instructionWidth;
                        this.conditionPassed = true;
                        // 執行
                        instruction.instruction();
                        if (!instruction.writesPC) {
                            if (this.instruction != null) { // We might have gotten an interrupt from the instruction
                                if (instruction.next == null || instruction.next.page?.invalid) {
                                    instruction.next = this.loadInstruction(gprs[this.PC] - this.instructionWidth);
                                }
                                this.instruction = instruction.next;
                            }
                        }
                        else {
                            if (this.conditionPassed) {
                                const pc = gprs[this.PC] &= 0xFFFFFFFE;
                                if (this.execMode == interfaces_ts_2.OpExecMode.ARM) {
                                    mmu.wait32(pc);
                                    mmu.waitPrefetch32(pc);
                                }
                                else {
                                    mmu.wait(pc);
                                    mmu.waitPrefetch(pc);
                                }
                                gprs[this.PC] += this.instructionWidth;
                                if (!instruction.fixedJump) {
                                    this.instruction = null;
                                }
                                else if (this.instruction != null) {
                                    if (instruction.next == null || instruction.next.page?.invalid) {
                                        instruction.next = this.loadInstruction(gprs[this.PC] - this.instructionWidth);
                                    }
                                    this.instruction = instruction.next;
                                }
                            }
                            else {
                                this.instruction = null;
                            }
                        }
                        this.irq.updateTimers();
                    }
                    freeze() {
                        return {
                            'gprs': [
                                this.gprs[0],
                                this.gprs[1],
                                this.gprs[2],
                                this.gprs[3],
                                this.gprs[4],
                                this.gprs[5],
                                this.gprs[6],
                                this.gprs[7],
                                this.gprs[8],
                                this.gprs[9],
                                this.gprs[10],
                                this.gprs[11],
                                this.gprs[12],
                                this.gprs[13],
                                this.gprs[14],
                                this.gprs[15],
                            ],
                            'mode': this.mode,
                            'cpsrI': this.cpsrI,
                            'cpsrF': this.cpsrF,
                            'cpsrV': this.cpsrV,
                            'cpsrC': this.cpsrC,
                            'cpsrZ': this.cpsrZ,
                            'cpsrN': this.cpsrN,
                            'bankedRegisters': [
                                [
                                    this.bankedRegisters[0][0],
                                    this.bankedRegisters[0][1],
                                    this.bankedRegisters[0][2],
                                    this.bankedRegisters[0][3],
                                    this.bankedRegisters[0][4],
                                    this.bankedRegisters[0][5],
                                    this.bankedRegisters[0][6]
                                ],
                                [
                                    this.bankedRegisters[1][0],
                                    this.bankedRegisters[1][1],
                                    this.bankedRegisters[1][2],
                                    this.bankedRegisters[1][3],
                                    this.bankedRegisters[1][4],
                                    this.bankedRegisters[1][5],
                                    this.bankedRegisters[1][6]
                                ],
                                [
                                    this.bankedRegisters[2][0],
                                    this.bankedRegisters[2][1]
                                ],
                                [
                                    this.bankedRegisters[3][0],
                                    this.bankedRegisters[3][1]
                                ],
                                [
                                    this.bankedRegisters[4][0],
                                    this.bankedRegisters[4][1]
                                ],
                                [
                                    this.bankedRegisters[5][0],
                                    this.bankedRegisters[5][1]
                                ]
                            ],
                            'spsr': this.spsr,
                            'bankedSPSRs': [
                                this.bankedSPSRs[0],
                                this.bankedSPSRs[1],
                                this.bankedSPSRs[2],
                                this.bankedSPSRs[3],
                                this.bankedSPSRs[4],
                                this.bankedSPSRs[5]
                            ],
                            'cycles': this.cycles
                        };
                    }
                    defrost(frost) {
                        this.instruction = null;
                        this.page = null;
                        this.pageId = 0;
                        this.pageRegion = -1;
                        this.gprs[0] = frost.gprs[0];
                        this.gprs[1] = frost.gprs[1];
                        this.gprs[2] = frost.gprs[2];
                        this.gprs[3] = frost.gprs[3];
                        this.gprs[4] = frost.gprs[4];
                        this.gprs[5] = frost.gprs[5];
                        this.gprs[6] = frost.gprs[6];
                        this.gprs[7] = frost.gprs[7];
                        this.gprs[8] = frost.gprs[8];
                        this.gprs[9] = frost.gprs[9];
                        this.gprs[10] = frost.gprs[10];
                        this.gprs[11] = frost.gprs[11];
                        this.gprs[12] = frost.gprs[12];
                        this.gprs[13] = frost.gprs[13];
                        this.gprs[14] = frost.gprs[14];
                        this.gprs[15] = frost.gprs[15];
                        this.mode = frost.mode;
                        this.cpsrI = frost.cpsrI;
                        this.cpsrF = frost.cpsrF;
                        this.cpsrV = frost.cpsrV;
                        this.cpsrC = frost.cpsrC;
                        this.cpsrZ = frost.cpsrZ;
                        this.cpsrN = frost.cpsrN;
                        this.bankedRegisters[0][0] = frost.bankedRegisters[0][0];
                        this.bankedRegisters[0][1] = frost.bankedRegisters[0][1];
                        this.bankedRegisters[0][2] = frost.bankedRegisters[0][2];
                        this.bankedRegisters[0][3] = frost.bankedRegisters[0][3];
                        this.bankedRegisters[0][4] = frost.bankedRegisters[0][4];
                        this.bankedRegisters[0][5] = frost.bankedRegisters[0][5];
                        this.bankedRegisters[0][6] = frost.bankedRegisters[0][6];
                        this.bankedRegisters[1][0] = frost.bankedRegisters[1][0];
                        this.bankedRegisters[1][1] = frost.bankedRegisters[1][1];
                        this.bankedRegisters[1][2] = frost.bankedRegisters[1][2];
                        this.bankedRegisters[1][3] = frost.bankedRegisters[1][3];
                        this.bankedRegisters[1][4] = frost.bankedRegisters[1][4];
                        this.bankedRegisters[1][5] = frost.bankedRegisters[1][5];
                        this.bankedRegisters[1][6] = frost.bankedRegisters[1][6];
                        this.bankedRegisters[2][0] = frost.bankedRegisters[2][0];
                        this.bankedRegisters[2][1] = frost.bankedRegisters[2][1];
                        this.bankedRegisters[3][0] = frost.bankedRegisters[3][0];
                        this.bankedRegisters[3][1] = frost.bankedRegisters[3][1];
                        this.bankedRegisters[4][0] = frost.bankedRegisters[4][0];
                        this.bankedRegisters[4][1] = frost.bankedRegisters[4][1];
                        this.bankedRegisters[5][0] = frost.bankedRegisters[5][0];
                        this.bankedRegisters[5][1] = frost.bankedRegisters[5][1];
                        this.spsr = frost.spsr;
                        this.bankedSPSRs[0] = frost.bankedSPSRs[0];
                        this.bankedSPSRs[1] = frost.bankedSPSRs[1];
                        this.bankedSPSRs[2] = frost.bankedSPSRs[2];
                        this.bankedSPSRs[3] = frost.bankedSPSRs[3];
                        this.bankedSPSRs[4] = frost.bankedSPSRs[4];
                        this.bankedSPSRs[5] = frost.bankedSPSRs[5];
                        this.cycles = frost.cycles;
                    }
                    fetchPage(address) {
                        const region = address >> this.mmu.BASE_OFFSET;
                        const pageId = this.mmu.addressToPage(region, address & this.mmu.OFFSET_MASK);
                        if (region == this.pageRegion) {
                            if (pageId == this.pageId && !this.page?.invalid) {
                                return;
                            }
                            this.pageId = pageId;
                        }
                        else {
                            this.pageMask = this.mmu.memory[region].PAGE_MASK;
                            this.pageRegion = region;
                            this.pageId = pageId;
                        }
                        this.page = this.mmu.accessPage(region, pageId);
                    }
                    /**
                     *
                     * @param address
                     */
                    loadInstructionArm(address) {
                        let next = null;
                        this.fetchPage(address);
                        const offset = (address & this.pageMask) >> 2;
                        if (!this.page) {
                            throw new Error("page is invalid");
                        }
                        next = this.page.arm[offset];
                        if (next) {
                            return next;
                        }
                        const instruction = this.mmu.load32(address) >>> 0;
                        next = this.compileArm(instruction);
                        next.next = null;
                        next.page = this.page;
                        next.address = address;
                        next.opcode = instruction;
                        this.page.arm[offset] = next;
                        return next;
                    }
                    /**
                     *
                     * @param address
                     */
                    loadInstructionThumb(address) {
                        let next = null;
                        this.fetchPage(address);
                        if (!this.page) {
                            throw new Error("page is invalid");
                        }
                        const offset = (address & this.pageMask) >> 1;
                        next = this.page.thumb[offset];
                        if (next) {
                            return next;
                        }
                        const instruction = this.mmu.load16(address);
                        next = this.compileThumb(instruction);
                        next.next = null;
                        next.page = this.page;
                        next.address = address;
                        next.opcode = instruction;
                        this.page.thumb[offset] = next;
                        return next;
                    }
                    /**
                     *
                     * @param mode
                     */
                    selectBank(mode) {
                        switch (mode) {
                            case interfaces_ts_2.ARMMode.User:
                            case interfaces_ts_2.ARMMode.System:
                                // No banked registers
                                return interfaces_ts_2.ARMBank.NONE;
                            case interfaces_ts_2.ARMMode.FIQ:
                                return interfaces_ts_2.ARMBank.FIQ;
                            case interfaces_ts_2.ARMMode.IRQ:
                                return interfaces_ts_2.ARMBank.IRQ;
                            case interfaces_ts_2.ARMMode.SVC:
                                return interfaces_ts_2.ARMBank.SUPERVISOR;
                            case interfaces_ts_2.ARMMode.ABT:
                                return interfaces_ts_2.ARMBank.ABORT;
                            case interfaces_ts_2.ARMMode.Undef:
                                return interfaces_ts_2.ARMBank.UNDEFINED;
                            default:
                                throw new Error("Invalid user mode passed to selectBank");
                        }
                    }
                    /**
                     * 切換指令集
                     * @param newMode
                     */
                    switchExecMode(newMode) {
                        if (this.execMode != newMode) {
                            this.execMode = newMode;
                            if (newMode == interfaces_ts_2.OpExecMode.ARM) {
                                this.instructionWidth = ARMCore.WORD_SIZE_ARM;
                                this.loadInstruction = this.loadInstructionArm;
                            }
                            else {
                                this.instructionWidth = ARMCore.WORD_SIZE_THUMB;
                                this.loadInstruction = this.loadInstructionThumb;
                            }
                        }
                    }
                    /**
                     * 切換模式
                     * @param newMode
                     */
                    switchMode(newMode) {
                        if (newMode == this.mode) {
                            // Not switching modes after all
                            return;
                        }
                        const currentMode = this.mode;
                        this.mode = newMode;
                        // Switch banked registers
                        const newBank = this.selectBank(newMode);
                        const oldBank = this.selectBank(currentMode);
                        if (newBank == oldBank) {
                            return;
                        }
                        if (newMode == interfaces_ts_2.ARMMode.FIQ || currentMode == interfaces_ts_2.ARMMode.FIQ) {
                            const oldFiqBank = (oldBank == interfaces_ts_2.ARMBank.FIQ) ? 1 : 0;
                            const newFiqBank = (newBank == interfaces_ts_2.ARMBank.FIQ) ? 1 : 0;
                            this.bankedRegisters[oldFiqBank][2] = this.gprs[8];
                            this.bankedRegisters[oldFiqBank][3] = this.gprs[9];
                            this.bankedRegisters[oldFiqBank][4] = this.gprs[10];
                            this.bankedRegisters[oldFiqBank][5] = this.gprs[11];
                            this.bankedRegisters[oldFiqBank][6] = this.gprs[12];
                            this.gprs[8] = this.bankedRegisters[newFiqBank][2];
                            this.gprs[9] = this.bankedRegisters[newFiqBank][3];
                            this.gprs[10] = this.bankedRegisters[newFiqBank][4];
                            this.gprs[11] = this.bankedRegisters[newFiqBank][5];
                            this.gprs[12] = this.bankedRegisters[newFiqBank][6];
                        }
                        this.bankedRegisters[oldBank][0] = this.gprs[this.SP];
                        this.bankedRegisters[oldBank][1] = this.gprs[this.LR];
                        this.gprs[this.SP] = this.bankedRegisters[newBank][0];
                        this.gprs[this.LR] = this.bankedRegisters[newBank][1];
                        this.bankedSPSRs[oldBank] = this.spsr;
                        this.spsr = this.bankedSPSRs[newBank];
                    }
                    /**
                     * 組合 CPSR 暫存器
                     */
                    packCPSR() {
                        const execMode = !!this.execMode ? 1 : 0;
                        const cpsrF = !!this.cpsrF ? 1 : 0;
                        const cpsrI = !!this.cpsrI ? 1 : 0;
                        const cpsrN = !!this.cpsrN ? 1 : 0;
                        const cpsrZ = !!this.cpsrZ ? 1 : 0;
                        const cpsrC = !!this.cpsrC ? 1 : 0;
                        const cpsrV = !!this.cpsrV ? 1 : 0;
                        return this.mode | (execMode << 5) | (cpsrF << 6) | (cpsrI << 7) |
                            (cpsrN << 31) | (cpsrZ << 30) | (cpsrC << 29) | (cpsrV << 28);
                    }
                    /**
                     * 從 SPSR 暫存器還原 CPSR 暫存器
                     * @param spsr
                     */
                    unpackCPSR(spsr) {
                        this.switchMode(spsr & 0x0000001F);
                        this.switchExecMode(!!(spsr & 0x00000020) ? 1 : 0);
                        this.cpsrF = spsr & 0x00000040;
                        this.cpsrI = spsr & 0x00000080;
                        this.cpsrN = spsr & 0x80000000;
                        this.cpsrZ = spsr & 0x40000000;
                        this.cpsrC = spsr & 0x20000000;
                        this.cpsrV = spsr & 0x10000000;
                        this.irq.testIRQ();
                    }
                    /**
                     * 是否支援 SPSR
                     */
                    hasSPSR() {
                        return this.mode != interfaces_ts_2.ARMMode.System && this.mode != interfaces_ts_2.ARMMode.User;
                    }
                    /**
                     *
                     */
                    raiseIRQ() {
                        if (this.cpsrI) {
                            return;
                        }
                        const cpsr = this.packCPSR();
                        const instructionWidth = this.instructionWidth;
                        this.switchMode(interfaces_ts_2.ARMMode.IRQ);
                        this.spsr = cpsr;
                        this.gprs[this.LR] = this.gprs[this.PC] - instructionWidth + 4;
                        this.gprs[this.PC] = BaseAddress.IRQ + ARMCore.WORD_SIZE_ARM;
                        this.instruction = null;
                        this.switchExecMode(interfaces_ts_2.OpExecMode.ARM);
                        this.cpsrI = true ? 1 : 0;
                    }
                    /**
                     *
                     */
                    raiseTrap() {
                        const cpsr = this.packCPSR();
                        const instructionWidth = this.instructionWidth;
                        this.switchMode(interfaces_ts_2.ARMMode.SVC);
                        this.spsr = cpsr;
                        this.gprs[this.LR] = this.gprs[this.PC] - instructionWidth;
                        this.gprs[this.PC] = BaseAddress.SWI + ARMCore.WORD_SIZE_ARM;
                        this.instruction = null;
                        this.switchExecMode(interfaces_ts_2.OpExecMode.ARM);
                        this.cpsrI = true ? 1 : 0;
                    }
                    /**
                     *
                     * @param instruction
                     */
                    badOp(instruction) {
                        const func = function () {
                            throw "Illegal instruction: 0x" + instruction.toString(16);
                        };
                        return {
                            instruction: func,
                            writesPC: true,
                            fixedJump: false
                        };
                    }
                    generateConds() {
                        const cpu = this;
                        this.conds = [
                            // EQ
                            function () {
                                cpu.conditionPassed = cpu.cpsrZ > 0;
                                return cpu.conditionPassed;
                            },
                            // NE
                            function () {
                                cpu.conditionPassed = !cpu.cpsrZ;
                                return cpu.conditionPassed;
                            },
                            // CS
                            function () {
                                cpu.conditionPassed = cpu.cpsrC > 0;
                                return cpu.conditionPassed;
                            },
                            // CC
                            function () {
                                cpu.conditionPassed = !cpu.cpsrC;
                                return cpu.conditionPassed;
                            },
                            // MI
                            function () {
                                cpu.conditionPassed = cpu.cpsrN > 0;
                                return cpu.conditionPassed;
                            },
                            // PL
                            function () {
                                cpu.conditionPassed = !cpu.cpsrN;
                                return cpu.conditionPassed;
                            },
                            // VS
                            function () {
                                cpu.conditionPassed = cpu.cpsrV > 0;
                                return cpu.conditionPassed;
                            },
                            // VC
                            function () {
                                cpu.conditionPassed = !cpu.cpsrV;
                                return cpu.conditionPassed;
                            },
                            // HI
                            function () {
                                cpu.conditionPassed = cpu.cpsrC > 0 && !cpu.cpsrZ;
                                return cpu.conditionPassed;
                            },
                            // LS
                            function () {
                                cpu.conditionPassed = !cpu.cpsrC || cpu.cpsrZ > 0;
                                return cpu.conditionPassed;
                            },
                            // GE
                            function () {
                                cpu.conditionPassed = !cpu.cpsrN == !cpu.cpsrV;
                                return cpu.conditionPassed;
                            },
                            // LT
                            function () {
                                cpu.conditionPassed = !cpu.cpsrN != !cpu.cpsrV;
                                return cpu.conditionPassed;
                            },
                            // GT
                            function () {
                                cpu.conditionPassed = !cpu.cpsrZ && !cpu.cpsrN == !cpu.cpsrV;
                                return cpu.conditionPassed;
                            },
                            // LE
                            function () {
                                cpu.conditionPassed = (cpu.cpsrZ > 0 || !cpu.cpsrN != !cpu.cpsrV);
                                return cpu.conditionPassed;
                            },
                            // AL
                            null,
                            null
                        ];
                    }
                    /**
                     *
                     * @param shiftType
                     * @param immediate
                     * @param rm
                     */
                    barrelShiftImmediate(shiftType, immediate, rm) {
                        const cpu = this;
                        const gprs = this.gprs;
                        switch (shiftType) {
                            case 0x00000000:
                                // LSL
                                if (immediate) {
                                    return function () {
                                        cpu.shifterOperand = gprs[rm] << immediate;
                                        cpu.shifterCarryOut = gprs[rm] & (1 << (32 - immediate));
                                    };
                                }
                                else {
                                    // This boils down to no shift
                                    return function () {
                                        cpu.shifterOperand = gprs[rm];
                                        cpu.shifterCarryOut = cpu.cpsrC;
                                    };
                                }
                                break;
                            case 0x00000020:
                                // LSR
                                if (immediate) {
                                    return function () {
                                        cpu.shifterOperand = gprs[rm] >>> immediate;
                                        cpu.shifterCarryOut = gprs[rm] & (1 << (immediate - 1));
                                    };
                                }
                                else {
                                    return function () {
                                        cpu.shifterOperand = 0;
                                        cpu.shifterCarryOut = gprs[rm] & 0x80000000;
                                    };
                                }
                                break;
                            case 0x00000040:
                                // ASR
                                if (immediate) {
                                    return function () {
                                        cpu.shifterOperand = gprs[rm] >> immediate;
                                        cpu.shifterCarryOut = gprs[rm] & (1 << (immediate - 1));
                                    };
                                }
                                else {
                                    return function () {
                                        cpu.shifterCarryOut = gprs[rm] & 0x80000000;
                                        if (cpu.shifterCarryOut) {
                                            cpu.shifterOperand = 0xFFFFFFFF;
                                        }
                                        else {
                                            cpu.shifterOperand = 0;
                                        }
                                    };
                                }
                                break;
                            case 0x00000060:
                                // ROR
                                if (immediate) {
                                    return function () {
                                        cpu.shifterOperand = (gprs[rm] >>> immediate) | (gprs[rm] << (32 - immediate));
                                        cpu.shifterCarryOut = gprs[rm] & (1 << (immediate - 1));
                                    };
                                }
                                else {
                                    // RRX
                                    return function () {
                                        const cpsrC = !!cpu.cpsrC ? 1 : 0;
                                        cpu.shifterOperand = (cpsrC << 31) | (gprs[rm] >>> 1);
                                        cpu.shifterCarryOut = gprs[rm] & 0x00000001;
                                    };
                                }
                                break;
                        }
                        return function () {
                            throw new Error(`bad immediate ${immediate}`);
                        };
                    }
                    armBX(instruction, condOp) {
                        const rm = instruction & 0xF;
                        const ins = this.armCompiler.constructBX(rm, condOp);
                        return {
                            instruction: ins,
                            writesPC: true,
                            fixedJump: false
                        };
                    }
                    armMRS(instruction, r, condOp) {
                        const rd = (instruction & 0x0000F000) >> 12;
                        const ins = this.armCompiler.constructMRS(rd, r, condOp);
                        return {
                            instruction: ins,
                            writesPC: (rd == this.PC)
                        };
                    }
                    armMSR(r, instruction, condOp) {
                        const rm = instruction & 0x0000000F;
                        const rotateImm = (instruction & 0x00000F00) >> 7;
                        let immediate = instruction & 0x000000FF;
                        immediate = (immediate >>> rotateImm) | (immediate << (32 - rotateImm));
                        const ins = this.armCompiler.constructMSR(rm, r, instruction, immediate, condOp);
                        return {
                            instruction: ins,
                            writesPC: false
                        };
                    }
                    badInstruction() {
                        return function () {
                            throw new Error("bad Instruction");
                        };
                    }
                    opcodeToArmOp(opcode, s, rd, rn, shiftOp, condOp) {
                        let op = this.badInstruction();
                        switch (opcode) {
                            case 0x00000000:
                                // AND
                                if (s) {
                                    op = this.armCompiler.constructANDS(rd, rn, shiftOp, condOp);
                                }
                                else {
                                    op = this.armCompiler.constructAND(rd, rn, shiftOp, condOp);
                                }
                                break;
                            case 0x00200000:
                                // EOR
                                if (s) {
                                    op = this.armCompiler.constructEORS(rd, rn, shiftOp, condOp);
                                }
                                else {
                                    op = this.armCompiler.constructEOR(rd, rn, shiftOp, condOp);
                                }
                                break;
                            case 0x00400000:
                                // SUB
                                if (s) {
                                    op = this.armCompiler.constructSUBS(rd, rn, shiftOp, condOp);
                                }
                                else {
                                    op = this.armCompiler.constructSUB(rd, rn, shiftOp, condOp);
                                }
                                break;
                            case 0x00600000:
                                // RSB
                                if (s) {
                                    op = this.armCompiler.constructRSBS(rd, rn, shiftOp, condOp);
                                }
                                else {
                                    op = this.armCompiler.constructRSB(rd, rn, shiftOp, condOp);
                                }
                                break;
                            case 0x00800000:
                                // ADD
                                if (s) {
                                    op = this.armCompiler.constructADDS(rd, rn, shiftOp, condOp);
                                }
                                else {
                                    op = this.armCompiler.constructADD(rd, rn, shiftOp, condOp);
                                }
                                break;
                            case 0x00A00000:
                                // ADC
                                if (s) {
                                    op = this.armCompiler.constructADCS(rd, rn, shiftOp, condOp);
                                }
                                else {
                                    op = this.armCompiler.constructADC(rd, rn, shiftOp, condOp);
                                }
                                break;
                            case 0x00C00000:
                                // SBC
                                if (s) {
                                    op = this.armCompiler.constructSBCS(rd, rn, shiftOp, condOp);
                                }
                                else {
                                    op = this.armCompiler.constructSBC(rd, rn, shiftOp, condOp);
                                }
                                break;
                            case 0x00E00000:
                                // RSC
                                if (s) {
                                    op = this.armCompiler.constructRSCS(rd, rn, shiftOp, condOp);
                                }
                                else {
                                    op = this.armCompiler.constructRSC(rd, rn, shiftOp, condOp);
                                }
                                break;
                            case 0x01000000:
                                // TST
                                op = this.armCompiler.constructTST(rd, rn, shiftOp, condOp);
                                break;
                            case 0x01200000:
                                // TEQ
                                op = this.armCompiler.constructTEQ(rd, rn, shiftOp, condOp);
                                break;
                            case 0x01400000:
                                // CMP
                                op = this.armCompiler.constructCMP(rd, rn, shiftOp, condOp);
                                break;
                            case 0x01600000:
                                // CMN
                                op = this.armCompiler.constructCMN(rd, rn, shiftOp, condOp);
                                break;
                            case 0x01800000:
                                // ORR
                                if (s) {
                                    op = this.armCompiler.constructORRS(rd, rn, shiftOp, condOp);
                                }
                                else {
                                    op = this.armCompiler.constructORR(rd, rn, shiftOp, condOp);
                                }
                                break;
                            case 0x01A00000:
                                // MOV
                                if (s) {
                                    op = this.armCompiler.constructMOVS(rd, rn, shiftOp, condOp);
                                }
                                else {
                                    op = this.armCompiler.constructMOV(rd, rn, shiftOp, condOp);
                                }
                                break;
                            case 0x01C00000:
                                // BIC
                                if (s) {
                                    op = this.armCompiler.constructBICS(rd, rn, shiftOp, condOp);
                                }
                                else {
                                    op = this.armCompiler.constructBIC(rd, rn, shiftOp, condOp);
                                }
                                break;
                            case 0x01E00000:
                                // MVN
                                if (s) {
                                    op = this.armCompiler.constructMVNS(rd, rn, shiftOp, condOp);
                                }
                                else {
                                    op = this.armCompiler.constructMVN(rd, rn, shiftOp, condOp);
                                }
                                break;
                        }
                        return {
                            instruction: op,
                            writesPC: (rd == this.PC)
                        };
                    }
                    shiftTypeToShiftOp(instruction, shiftType, rm) {
                        const rs = (instruction & 0x00000F00) >> 8;
                        let shiftOp = this.badInstruction();
                        switch (shiftType) {
                            case 0x00000000:
                                // LSL
                                shiftOp = this.armCompiler.constructAddressingMode1LSL(rs, rm);
                                break;
                            case 0x00000020:
                                // LSR
                                shiftOp = this.armCompiler.constructAddressingMode1LSR(rs, rm);
                                break;
                            case 0x00000040:
                                // ASR
                                shiftOp = this.armCompiler.constructAddressingMode1ASR(rs, rm);
                                break;
                            case 0x00000060:
                                // ROR
                                shiftOp = this.armCompiler.constructAddressingMode1ROR(rs, rm);
                                break;
                        }
                        return shiftOp;
                    }
                    /**
                     * 建立錯誤的記憶體位址
                     * @param instruction
                     */
                    badAddress(instruction) {
                        const badAddress = function () {
                            throw "Unimplemented memory access: 0x" + instruction.toString(16);
                        };
                        badAddress.writesPC = false;
                        return badAddress;
                    }
                    armLDRSTR(instruction, condOp) {
                        const rd = (instruction & 0x0000F000) >> 12;
                        let load2 = instruction & 0x00100000;
                        const b = instruction & 0x00400000;
                        const i = instruction & 0x02000000;
                        let address2 = this.badAddress(instruction);
                        if (~instruction & 0x01000000) {
                            // Clear the W bit if the P bit is clear--we don't support memory translation, so these turn into regular accesses
                            instruction &= 0xFFDFFFFF;
                        }
                        if (i) {
                            // Register offset
                            var rm = instruction & 0x0000000F;
                            var shiftType = instruction & 0x00000060;
                            var shiftImmediate = (instruction & 0x00000F80) >> 7;
                            if (shiftType || shiftImmediate) {
                                const shiftOp = this.barrelShiftImmediate(shiftType, shiftImmediate, rm);
                                address2 = this.armCompiler.constructAddressingMode2RegisterShifted(instruction, shiftOp, condOp);
                            }
                            else {
                                address2 = this.armCompiler.constructAddressingMode23Register(instruction, rm, condOp);
                            }
                        }
                        else {
                            // Immediate
                            const offset = instruction & 0x00000FFF;
                            address2 = this.armCompiler.constructAddressingMode23Immediate(instruction, offset, condOp);
                        }
                        let ins = this.badInstruction();
                        if (load2) {
                            if (b) {
                                // LDRB
                                ins = this.armCompiler.constructLDRB(rd, address2, condOp);
                            }
                            else {
                                // LDR
                                ins = this.armCompiler.constructLDR(rd, address2, condOp);
                            }
                        }
                        else {
                            if (b) {
                                // STRB
                                ins = this.armCompiler.constructSTRB(rd, address2, condOp);
                            }
                            else {
                                // STR
                                ins = this.armCompiler.constructSTR(rd, address2, condOp);
                            }
                        }
                        const writesPC = ((rd == this.PC) || address2.writesPC);
                        return {
                            instruction: ins,
                            writesPC
                        };
                    }
                    defaultConditionOperator() {
                        return function () {
                            return true;
                        };
                    }
                    badShiftOperator() {
                        return function () {
                            throw 'BUG: invalid barrel shifter';
                        };
                    }
                    arm001(instruction, condOp) {
                        const opcode = instruction & 0x01E00000;
                        const s = (instruction & 0x00100000) > 0;
                        let shiftsRs = false;
                        let op = this.badOp(instruction);
                        if ((opcode & 0x01800000) == 0x01000000 && !s) {
                            const r = (instruction & 0x00400000) > 0;
                            if ((instruction & 0x00B0F000) == 0x0020F000) {
                                op = this.armMSR(r, instruction, condOp);
                            }
                            else if ((instruction & 0x00BF0000) == 0x000F0000) {
                                op = this.armMRS(instruction, r, condOp);
                            }
                        }
                        else {
                            // Data processing/FSR transfer
                            const rn = (instruction & 0x000F0000) >> 16;
                            const rd = (instruction & 0x0000F000) >> 12;
                            // Parse shifter operand
                            const shiftType = instruction & 0x00000060;
                            const rm = instruction & 0x0000000F;
                            let shiftOp = this.badShiftOperator();
                            if (instruction & 0x02000000) {
                                const immediate = instruction & 0x000000FF;
                                const rotate = (instruction & 0x00000F00) >> 7;
                                if (!rotate) {
                                    shiftOp = this.armCompiler.constructAddressingMode1Immediate(immediate);
                                }
                                else {
                                    shiftOp = this.armCompiler.constructAddressingMode1ImmediateRotate(immediate, rotate);
                                }
                            }
                            else if (instruction & 0x00000010) {
                                shiftsRs = true;
                                shiftOp = this.shiftTypeToShiftOp(instruction, shiftType, rm);
                            }
                            else {
                                const immediate = (instruction & 0x00000F80) >> 7;
                                shiftOp = this.barrelShiftImmediate(shiftType, immediate, rm);
                            }
                            op = this.opcodeToArmOp(opcode, s, rd, rn, shiftOp, condOp);
                        }
                        return op;
                    }
                    armSingleDataSwap(instruction, condOp) {
                        const rm = instruction & 0x0000000F;
                        const rd = (instruction >> 12) & 0x0000000F;
                        const rn = (instruction >> 16) & 0x0000000F;
                        let ins;
                        if (instruction & 0x00400000) {
                            ins = this.armCompiler.constructSWPB(rd, rn, rm, condOp);
                        }
                        else {
                            ins = this.armCompiler.constructSWP(rd, rn, rm, condOp);
                        }
                        return {
                            instruction: ins,
                            writesPC: (rd == this.PC)
                        };
                    }
                    armMultiplies(instruction, condOp) {
                        // Multiplies
                        const rd = (instruction & 0x000F0000) >> 16;
                        const rn = (instruction & 0x0000F000) >> 12;
                        const rs = (instruction & 0x00000F00) >> 8;
                        const rm = instruction & 0x0000000F;
                        const index = instruction & 0x00F00000;
                        const armCompiler = this.armCompiler;
                        const func3Tofunc4 = function (handler) {
                            return function (rd, rn, rs, rm, condOp) {
                                return handler.call(armCompiler, rd, rs, rm, condOp);
                            };
                        };
                        const func = {
                            // MUL
                            0x00000000: func3Tofunc4(this.armCompiler.constructMUL),
                            // MULS
                            0x00100000: func3Tofunc4(this.armCompiler.constructMULS),
                            // MLA
                            0x00200000: this.armCompiler.constructMLA,
                            // MLAS
                            0x00300000: this.armCompiler.constructMLAS,
                            // UMULL
                            0x00800000: this.armCompiler.constructUMULL,
                            // UMULLS
                            0x00900000: this.armCompiler.constructUMULLS,
                            // UMLAL
                            0x00A00000: this.armCompiler.constructUMLAL,
                            // UMLALS
                            0x00B00000: this.armCompiler.constructUMLALS,
                            // SMULL
                            0x00C00000: this.armCompiler.constructSMULL,
                            // SMULLS
                            0x00D00000: this.armCompiler.constructSMULLS,
                            // SMLAL
                            0x00E00000: this.armCompiler.constructSMLAL,
                            // SMLALS
                            0x00F00000: this.armCompiler.constructSMLALS
                        };
                        if (index in func) {
                            return {
                                instruction: func[index].call(this.armCompiler, rd, rn, rs, rm, condOp),
                                writesPC: (rd == this.PC)
                            };
                        }
                        else {
                            return this.badOp(instruction);
                        }
                    }
                    Instruction2Op(ins) {
                        return {
                            instruction: ins,
                            writesPC: false
                        };
                    }
                    armDataTransfer(instruction, condOp) {
                        // Halfword and signed byte data transfer
                        let load = instruction & 0x00100000;
                        const rd = (instruction & 0x0000F000) >> 12;
                        const hiOffset = (instruction & 0x00000F00) >> 4;
                        const rm = instruction & 0x0000000F;
                        const rn = (instruction & 0x0000F000) >> 12;
                        const loOffset = rm;
                        const h = instruction & 0x00000020;
                        const s = instruction & 0x00000040;
                        const w = instruction & 0x00200000;
                        const i = instruction & 0x00400000;
                        let address;
                        if (i) {
                            const immediate = loOffset | hiOffset;
                            address = this.armCompiler.constructAddressingMode23Immediate(instruction, immediate, condOp);
                        }
                        else {
                            address = this.armCompiler.constructAddressingMode23Register(instruction, rm, condOp);
                        }
                        address.writesPC = !!w && (rn == this.PC); // ??
                        let op = this.badOp(instruction);
                        if ((instruction & 0x00000090) == 0x00000090) {
                            if (load) {
                                // Load [signed] halfword/byte
                                if (h) {
                                    if (s) {
                                        // LDRSH
                                        op = this.Instruction2Op(this.armCompiler.constructLDRSH(rd, address, condOp));
                                    }
                                    else {
                                        // LDRH
                                        op = this.Instruction2Op(this.armCompiler.constructLDRH(rd, address, condOp));
                                    }
                                }
                                else {
                                    if (s) {
                                        // LDRSB
                                        op = this.Instruction2Op(this.armCompiler.constructLDRSB(rd, address, condOp));
                                    }
                                }
                            }
                            else if (!s && h) {
                                // STRH
                                op = this.Instruction2Op(this.armCompiler.constructSTRH(rd, address, condOp));
                            }
                        }
                        op.writesPC = ((rd == this.PC) || address.writesPC);
                        return op;
                    }
                    armBlockTransfer(instruction, condOp) {
                        // Block data transfer
                        const load = instruction & 0x00100000;
                        const w = instruction & 0x00200000;
                        const user = instruction & 0x00400000;
                        const u = instruction & 0x00800000;
                        const p = instruction & 0x01000000;
                        let rs = instruction & 0x0000FFFF;
                        const rn = (instruction & 0x000F0000) >> 16;
                        let immediate = 0;
                        let offset = 0;
                        let overlap = false;
                        if (u) {
                            if (p) {
                                immediate = 4;
                            }
                            for (let m = 0x01, i = 0; i < 16; m <<= 1, ++i) {
                                if (rs & m) {
                                    if (w && i == rn && !offset) {
                                        rs &= ~m;
                                        immediate += 4;
                                        overlap = true;
                                    }
                                    offset += 4;
                                }
                            }
                        }
                        else {
                            if (!p) {
                                immediate = 4;
                            }
                            for (let m = 0x01, i = 0; i < 16; m <<= 1, ++i) {
                                if (rs & m) {
                                    if (w && i == rn && !offset) {
                                        rs &= ~m;
                                        immediate += 4;
                                        overlap = true;
                                    }
                                    immediate -= 4;
                                    offset -= 4;
                                }
                            }
                        }
                        let address;
                        if (w) {
                            address = this.armCompiler.constructAddressingMode4Writeback(immediate, offset, rn, overlap);
                        }
                        else {
                            address = this.armCompiler.constructAddressingMode4(immediate, rn);
                        }
                        if (load) {
                            // LDM
                            let ins;
                            if (user) {
                                ins = this.armCompiler.constructLDMS(rs, address, condOp);
                            }
                            else {
                                ins = this.armCompiler.constructLDM(rs, address, condOp);
                            }
                            return {
                                instruction: ins,
                                writesPC: !!(rs & (1 << 15))
                            };
                        }
                        else {
                            // STM
                            let ins;
                            if (user) {
                                ins = this.armCompiler.constructSTMS(rs, address, condOp);
                            }
                            else {
                                ins = this.armCompiler.constructSTM(rs, address, condOp);
                            }
                            return {
                                instruction: ins,
                                writesPC: !!(rs & (1 << 15))
                            };
                        }
                    }
                    armBranch(instruction, condOp) {
                        // Branch
                        let immediate2 = instruction & 0x00FFFFFF;
                        if (immediate2 & 0x00800000) {
                            immediate2 |= 0xFF000000;
                        }
                        immediate2 <<= 2;
                        const link = instruction & 0x01000000;
                        let ins2;
                        if (link) {
                            ins2 = this.armCompiler.constructBL(immediate2, condOp);
                        }
                        else {
                            ins2 = this.armCompiler.constructB(immediate2, condOp);
                        }
                        return {
                            instruction: ins2,
                            writesPC: true,
                            fixedJump: true
                        };
                    }
                    /**
                     * 產生 Arm 執行指令
                     * @param instruction
                     */
                    compileArm(instruction) {
                        let op = this.badOp(instruction);
                        let i = instruction & 0x0E000000;
                        const cpu = this;
                        const gprs = this.gprs;
                        let condOp = this.conds[(instruction & 0xF0000000) >>> 28];
                        if (!condOp) {
                            condOp = this.defaultConditionOperator();
                        }
                        if ((instruction & 0x0FFFFFF0) == 0x012FFF10) {
                            op = this.armBX(instruction, condOp);
                        }
                        else if (!(instruction & 0x0C000000) && (i == 0x02000000 || (instruction & 0x00000090) != 0x00000090)) {
                            op = this.arm001(instruction, condOp);
                        }
                        else if ((instruction & 0x0FB00FF0) == 0x01000090) {
                            op = this.armSingleDataSwap(instruction, condOp);
                        }
                        else {
                            switch (i) {
                                case 0x00000000:
                                    if ((instruction & 0x010000F0) == 0x00000090) {
                                        op = this.armMultiplies(instruction, condOp);
                                    }
                                    else {
                                        op = this.armDataTransfer(instruction, condOp);
                                    }
                                    break;
                                case 0x04000000:
                                case 0x06000000:
                                    op = this.armLDRSTR(instruction, condOp);
                                    break;
                                case 0x08000000:
                                    op = this.armBlockTransfer(instruction, condOp);
                                    break;
                                case 0x0A000000:
                                    op = this.armBranch(instruction, condOp);
                                    break;
                                case 0x0C000000:
                                    // Coprocessor data transfer
                                    break;
                                case 0x0E000000:
                                    // Coprocessor data operation/SWI
                                    if ((instruction & 0x0F000000) == 0x0F000000) {
                                        // SWI
                                        const immediate = (instruction & 0x00FFFFFF);
                                        op = this.Instruction2Op(this.armCompiler.constructSWI(immediate, condOp));
                                        op.writesPC = false;
                                    }
                                    break;
                                default:
                                    throw 'Bad opcode: 0x' + instruction.toString(16);
                            }
                        }
                        op.execMode = interfaces_ts_2.OpExecMode.ARM;
                        op.fixedJump = op.fixedJump || false;
                        return op;
                    }
                    thumbDataProcessingRegister(instruction) {
                        const rm = (instruction & 0x0038) >> 3;
                        const rd = instruction & 0x0007;
                        let op = this.badInstruction();
                        switch (instruction & 0x03C0) {
                            case 0x0000:
                                // AND
                                op = this.thumbCompiler.constructAND(rd, rm);
                                break;
                            case 0x0040:
                                // EOR
                                op = this.thumbCompiler.constructEOR(rd, rm);
                                break;
                            case 0x0080:
                                // LSL(2)
                                op = this.thumbCompiler.constructLSL2(rd, rm);
                                break;
                            case 0x00C0:
                                // LSR(2)
                                op = this.thumbCompiler.constructLSR2(rd, rm);
                                break;
                            case 0x0100:
                                // ASR(2)
                                op = this.thumbCompiler.constructASR2(rd, rm);
                                break;
                            case 0x0140:
                                // ADC
                                op = this.thumbCompiler.constructADC(rd, rm);
                                break;
                            case 0x0180:
                                // SBC
                                op = this.thumbCompiler.constructSBC(rd, rm);
                                break;
                            case 0x01C0:
                                // ROR
                                op = this.thumbCompiler.constructROR(rd, rm);
                                break;
                            case 0x0200:
                                // TST
                                op = this.thumbCompiler.constructTST(rd, rm);
                                break;
                            case 0x0240:
                                // NEG
                                op = this.thumbCompiler.constructNEG(rd, rm);
                                break;
                            case 0x0280:
                                // CMP(2)
                                op = this.thumbCompiler.constructCMP2(rd, rm);
                                break;
                            case 0x02C0:
                                // CMN
                                op = this.thumbCompiler.constructCMN(rd, rm);
                                break;
                            case 0x0300:
                                // ORR
                                op = this.thumbCompiler.constructORR(rd, rm);
                                break;
                            case 0x0340:
                                // MUL
                                op = this.thumbCompiler.constructMUL(rd, rm);
                                break;
                            case 0x0380:
                                // BIC
                                op = this.thumbCompiler.constructBIC(rd, rm);
                                break;
                            case 0x03C0:
                                // MVN
                                op = this.thumbCompiler.constructMVN(rd, rm);
                                break;
                        }
                        return op;
                    }
                    compileThumb(instruction) {
                        var op = this.badOp(instruction & 0xFFFF);
                        const cpu = this;
                        const gprs = this.gprs;
                        if ((instruction & 0xFC00) == 0x4000) {
                            // Data-processing register
                            const ins = this.thumbDataProcessingRegister(instruction);
                            op.instruction = ins;
                            op.writesPC = false;
                        }
                        else if ((instruction & 0xFC00) == 0x4400) {
                            // Special data processing / branch/exchange instruction set
                            const rm = (instruction & 0x0078) >> 3;
                            const rn = instruction & 0x0007;
                            const h1 = instruction & 0x0080;
                            const rd = rn | (h1 >> 4);
                            let ins;
                            switch (instruction & 0x0300) {
                                case 0x0000:
                                    // ADD(4)
                                    ins = this.thumbCompiler.constructADD4(rd, rm);
                                    op.instruction = ins;
                                    op.writesPC = rd == this.PC;
                                    break;
                                case 0x0100:
                                    // CMP(3)
                                    ins = this.thumbCompiler.constructCMP3(rd, rm);
                                    op.instruction = ins;
                                    op.writesPC = false;
                                    break;
                                case 0x0200:
                                    // MOV(3)
                                    ins = this.thumbCompiler.constructMOV3(rd, rm);
                                    op.instruction = ins;
                                    op.writesPC = rd == this.PC;
                                    break;
                                case 0x0300:
                                    // BX
                                    ins = this.thumbCompiler.constructBX(rd, rm);
                                    op.instruction = ins;
                                    op.writesPC = true;
                                    op.fixedJump = false;
                                    break;
                            }
                        }
                        else if ((instruction & 0xF800) == 0x1800) {
                            // Add/subtract
                            const rm = (instruction & 0x01C0) >> 6;
                            const rn = (instruction & 0x0038) >> 3;
                            const rd = instruction & 0x0007;
                            switch (instruction & 0x0600) {
                                case 0x0000:
                                    // ADD(3)
                                    op.instruction = this.thumbCompiler.constructADD3(rd, rn, rm);
                                    break;
                                case 0x0200:
                                    // SUB(3)
                                    op.instruction = this.thumbCompiler.constructSUB3(rd, rn, rm);
                                    break;
                                case 0x0400:
                                    const immediate = (instruction & 0x01C0) >> 6;
                                    if (immediate) {
                                        // ADD(1)
                                        op.instruction = this.thumbCompiler.constructADD1(rd, rn, immediate);
                                    }
                                    else {
                                        // MOV(2)
                                        op.instruction = this.thumbCompiler.constructMOV2(rd, rn, rm);
                                    }
                                    break;
                                case 0x0600:
                                    // SUB(1)
                                    const immediate2 = (instruction & 0x01C0) >> 6;
                                    op.instruction = this.thumbCompiler.constructSUB1(rd, rn, immediate2);
                                    break;
                            }
                            op.writesPC = false;
                        }
                        else if (!(instruction & 0xE000)) {
                            // Shift by immediate
                            const rd = instruction & 0x0007;
                            const rm = (instruction & 0x0038) >> 3;
                            const immediate = (instruction & 0x07C0) >> 6;
                            switch (instruction & 0x1800) {
                                case 0x0000:
                                    // LSL(1)
                                    op.instruction = this.thumbCompiler.constructLSL1(rd, rm, immediate);
                                    break;
                                case 0x0800:
                                    // LSR(1)
                                    op.instruction = this.thumbCompiler.constructLSR1(rd, rm, immediate);
                                    break;
                                case 0x1000:
                                    // ASR(1)
                                    op.instruction = this.thumbCompiler.constructASR1(rd, rm, immediate);
                                    break;
                                case 0x1800:
                                    break;
                            }
                            op.writesPC = false;
                        }
                        else if ((instruction & 0xE000) == 0x2000) {
                            // Add/subtract/compare/move immediate
                            const immediate = instruction & 0x00FF;
                            const rn = (instruction & 0x0700) >> 8;
                            switch (instruction & 0x1800) {
                                case 0x0000:
                                    // MOV(1)
                                    op.instruction = this.thumbCompiler.constructMOV1(rn, immediate);
                                    break;
                                case 0x0800:
                                    // CMP(1)
                                    op.instruction = this.thumbCompiler.constructCMP1(rn, immediate);
                                    break;
                                case 0x1000:
                                    // ADD(2)
                                    op.instruction = this.thumbCompiler.constructADD2(rn, immediate);
                                    break;
                                case 0x1800:
                                    // SUB(2)
                                    op.instruction = this.thumbCompiler.constructSUB2(rn, immediate);
                                    break;
                            }
                            op.writesPC = false;
                        }
                        else if ((instruction & 0xF800) == 0x4800) {
                            // LDR(3)
                            const rd = (instruction & 0x0700) >> 8;
                            const immediate = (instruction & 0x00FF) << 2;
                            op.instruction = this.thumbCompiler.constructLDR3(rd, immediate);
                            op.writesPC = false;
                        }
                        else if ((instruction & 0xF000) == 0x5000) {
                            // Load and store with relative offset
                            const rd = instruction & 0x0007;
                            const rn = (instruction & 0x0038) >> 3;
                            const rm = (instruction & 0x01C0) >> 6;
                            const opcode = instruction & 0x0E00;
                            switch (opcode) {
                                case 0x0000:
                                    // STR(2)
                                    op.instruction = this.thumbCompiler.constructSTR2(rd, rn, rm);
                                    break;
                                case 0x0200:
                                    // STRH(2)
                                    op.instruction = this.thumbCompiler.constructSTRH2(rd, rn, rm);
                                    break;
                                case 0x0400:
                                    // STRB(2)
                                    op.instruction = this.thumbCompiler.constructSTRB2(rd, rn, rm);
                                    break;
                                case 0x0600:
                                    // LDRSB
                                    op.instruction = this.thumbCompiler.constructLDRSB(rd, rn, rm);
                                    break;
                                case 0x0800:
                                    // LDR(2)
                                    op.instruction = this.thumbCompiler.constructLDR2(rd, rn, rm);
                                    break;
                                case 0x0A00:
                                    // LDRH(2)
                                    op.instruction = this.thumbCompiler.constructLDRH2(rd, rn, rm);
                                    break;
                                case 0x0C00:
                                    // LDRB(2)
                                    op.instruction = this.thumbCompiler.constructLDRB2(rd, rn, rm);
                                    break;
                                case 0x0E00:
                                    // LDRSH
                                    op.instruction = this.thumbCompiler.constructLDRSH(rd, rn, rm);
                                    break;
                            }
                            op.writesPC = false;
                        }
                        else if ((instruction & 0xE000) == 0x6000) {
                            // Load and store with immediate offset
                            const rd = instruction & 0x0007;
                            const rn = (instruction & 0x0038) >> 3;
                            let immediate = (instruction & 0x07C0) >> 4;
                            const b = instruction & 0x1000;
                            if (b) {
                                immediate >>= 2;
                            }
                            var load = instruction & 0x0800;
                            if (load) {
                                if (b) {
                                    // LDRB(1)
                                    op.instruction = this.thumbCompiler.constructLDRB1(rd, rn, immediate);
                                }
                                else {
                                    // LDR(1)
                                    op.instruction = this.thumbCompiler.constructLDR1(rd, rn, immediate);
                                }
                            }
                            else {
                                if (b) {
                                    // STRB(1)
                                    op.instruction = this.thumbCompiler.constructSTRB1(rd, rn, immediate);
                                }
                                else {
                                    // STR(1)
                                    op.instruction = this.thumbCompiler.constructSTR1(rd, rn, immediate);
                                }
                            }
                            op.writesPC = false;
                        }
                        else if ((instruction & 0xF600) == 0xB400) {
                            // Push and pop registers
                            const r = !!(instruction & 0x0100);
                            const rs = instruction & 0x00FF;
                            if (instruction & 0x0800) {
                                // POP
                                op.instruction = this.thumbCompiler.constructPOP(rs, r);
                                op.writesPC = r;
                                op.fixedJump = false;
                            }
                            else {
                                // PUSH
                                op.instruction = this.thumbCompiler.constructPUSH(rs, r);
                                op.writesPC = false;
                            }
                        }
                        else if (instruction & 0x8000) {
                            switch (instruction & 0x7000) {
                                case 0x0000:
                                    // Load and store halfword
                                    const rd = instruction & 0x0007;
                                    const rn = (instruction & 0x0038) >> 3;
                                    const immediate = (instruction & 0x07C0) >> 5;
                                    if (instruction & 0x0800) {
                                        // LDRH(1)
                                        op.instruction = this.thumbCompiler.constructLDRH1(rd, rn, immediate);
                                    }
                                    else {
                                        // STRH(1)
                                        op.instruction = this.thumbCompiler.constructSTRH1(rd, rn, immediate);
                                    }
                                    op.writesPC = false;
                                    break;
                                case 0x1000:
                                    // SP-relative load and store
                                    const rd2 = (instruction & 0x0700) >> 8;
                                    const immediate2 = (instruction & 0x00FF) << 2;
                                    const load = instruction & 0x0800;
                                    if (load) {
                                        // LDR(4)
                                        op.instruction = this.thumbCompiler.constructLDR4(rd2, immediate2);
                                    }
                                    else {
                                        // STR(3)
                                        op.instruction = this.thumbCompiler.constructSTR3(rd2, immediate2);
                                    }
                                    op.writesPC = false;
                                    break;
                                case 0x2000:
                                    // Load address
                                    const rd3 = (instruction & 0x0700) >> 8;
                                    const immediate3 = (instruction & 0x00FF) << 2;
                                    if (instruction & 0x0800) {
                                        // ADD(6)
                                        op.instruction = this.thumbCompiler.constructADD6(rd3, immediate3);
                                    }
                                    else {
                                        // ADD(5)
                                        op.instruction = this.thumbCompiler.constructADD5(rd3, immediate3);
                                    }
                                    op.writesPC = false;
                                    break;
                                case 0x3000:
                                    // Miscellaneous
                                    if (!(instruction & 0x0F00)) {
                                        // Adjust stack pointer
                                        // ADD(7)/SUB(4)
                                        const b = instruction & 0x0080;
                                        let immediate4 = (instruction & 0x7F) << 2;
                                        if (b) {
                                            immediate4 = -immediate4;
                                        }
                                        op.instruction = this.thumbCompiler.constructADD7(immediate4);
                                        op.writesPC = false;
                                    }
                                    break;
                                case 0x4000:
                                    // Multiple load and store
                                    const rn5 = (instruction & 0x0700) >> 8;
                                    const rs = instruction & 0x00FF;
                                    if (instruction & 0x0800) {
                                        // LDMIA
                                        op.instruction = this.thumbCompiler.constructLDMIA(rn5, rs);
                                    }
                                    else {
                                        // STMIA
                                        op.instruction = this.thumbCompiler.constructSTMIA(rn5, rs);
                                    }
                                    op.writesPC = false;
                                    break;
                                case 0x5000:
                                    // Conditional branch
                                    const cond = (instruction & 0x0F00) >> 8;
                                    let immediate6 = (instruction & 0x00FF);
                                    if (cond == 0xF) {
                                        // SWI
                                        op.instruction = this.thumbCompiler.constructSWI(immediate6);
                                        op.writesPC = false;
                                    }
                                    else {
                                        // B(1)
                                        if (instruction & 0x0080) {
                                            immediate6 |= 0xFFFFFF00;
                                        }
                                        immediate6 <<= 1;
                                        let condOp = this.conds[cond];
                                        if (!condOp) {
                                            condOp = function () {
                                                return true;
                                            };
                                        }
                                        op.instruction = this.thumbCompiler.constructB1(immediate6, condOp);
                                        op.writesPC = true;
                                        op.fixedJump = true;
                                    }
                                    break;
                                case 0x6000:
                                case 0x7000:
                                    // BL(X)
                                    let immediate7 = instruction & 0x07FF;
                                    const h = instruction & 0x1800;
                                    switch (h) {
                                        case 0x0000:
                                            // B(2)
                                            if (immediate7 & 0x0400) {
                                                immediate7 |= 0xFFFFF800;
                                            }
                                            immediate7 <<= 1;
                                            op.instruction = this.thumbCompiler.constructB2(immediate7);
                                            op.writesPC = true;
                                            op.fixedJump = true;
                                            break;
                                        case 0x0800:
                                            // BLX (ARMv5T)
                                            /*op() {
                                                var pc = gprs[cpu.PC];
                                                gprs[cpu.PC] = (gprs[cpu.LR] + (immediate << 1)) & 0xFFFFFFFC;
                                                gprs[cpu.LR] = pc - 1;
                                                cpu.switchExecMode(cpu.MODE_ARM);
                                            }*/
                                            break;
                                        case 0x1000:
                                            // BL(1)
                                            if (immediate7 & 0x0400) {
                                                immediate7 |= 0xFFFFFC00;
                                            }
                                            immediate7 <<= 12;
                                            op.instruction = this.thumbCompiler.constructBL1(immediate7);
                                            op.writesPC = false;
                                            break;
                                        case 0x1800:
                                            // BL(2)
                                            op.instruction = this.thumbCompiler.constructBL2(immediate7);
                                            op.writesPC = true;
                                            op.fixedJump = false;
                                            break;
                                    }
                                    break;
                                default:
                                    this.WARN("Undefined instruction: 0x" + instruction.toString(16));
                            }
                        }
                        else {
                            throw 'Bad opcode: 0x' + instruction.toString(16);
                        }
                        op.execMode = interfaces_ts_2.OpExecMode.THUMB;
                        op.fixedJump = op.fixedJump || false;
                        return op;
                    }
                    WARN(message) {
                        console.error(message);
                    }
                }
                ARMCore.WORD_SIZE_ARM = 4;
                ARMCore.WORD_SIZE_THUMB = 2;
                return ARMCore;
            })();
            exports_5("default", ARMCore);
        }
    };
});
System.register("core/mod", ["core/ARMCore"], function (exports_6, context_6) {
    "use strict";
    var ARMCore_ts_1;
    var __moduleName = context_6 && context_6.id;
    return {
        setters: [
            function (ARMCore_ts_1_1) {
                ARMCore_ts_1 = ARMCore_ts_1_1;
            }
        ],
        execute: function () {
            exports_6("ARMCore", ARMCore_ts_1.default);
        }
    };
});

const __exp = __instantiate("core/mod", false);
export const ARMCore = __exp["ARMCore"];
