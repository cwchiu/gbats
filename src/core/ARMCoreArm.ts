import {ICompilerArm, ICPU, ICPUOperator, IConditionOperator, ICPUAddress, IInstruction, ICPUAddress2, ARMMode} from "../interfaces.ts";
import {SHIFT_32} from "../constants.ts";

interface  ImmediateAddress {
    (rn: number, offset: number, condOp: IConditionOperator|null): ICPUAddress
}

interface  RegisterAddress {
    (rn: number, offset: number, condOp: IConditionOperator|null): ICPUAddress
}

interface  RegisterShiftedAddress {
    (rn: number, shiftOp:ICPUOperator, condOp:IConditionOperator|null):ICPUAddress
}

export default class ARMCoreArm implements ICompilerArm {
    cpu: ICPU
    addressingMode23Immediate: Array<ImmediateAddress|null>
    addressingMode23Register: Array<RegisterAddress|null>
    addressingMode2RegisterShifted: Array<RegisterShiftedAddress|null>

    constructor(cpu: ICPU){
        this.cpu = cpu;    
        this.addressingMode23Immediate = [
            // 000x0
            function(rn: number, offset: number, condOp: IConditionOperator|null): ICPUAddress {
                const gprs = cpu.gprs;
                const address = function() {
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
            function(rn: number, offset: number, condOp: IConditionOperator|null): ICPUAddress {
                const gprs = cpu.gprs;
                const address = function() {
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
            function(rn: number, offset: number, condOp: IConditionOperator|null): ICPUAddress {
                const gprs = cpu.gprs;
                const address = function() {
                    return gprs[rn] - offset;
                };
                address.writesPC = false;
                return address;
            },
    
            // 0P0xW
            function(rn: number, offset: number, condOp: IConditionOperator|null): ICPUAddress {
                const gprs = cpu.gprs;
                const address = function() {
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
            function(rn: number, offset: number, condOp: IConditionOperator|null): ICPUAddress {
                const gprs = cpu.gprs;
                const address = function() {
                    return gprs[rn] + offset;
                };
                address.writesPC = false;
                return address;
            },
    
            // 0PUxW
            function(rn: number, offset: number, condOp: IConditionOperator|null): ICPUAddress {
                const gprs = cpu.gprs;
                const address = function() {
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
            function(rn: number, rm: number, condOp: IConditionOperator|null): ICPUAddress {
                const gprs = cpu.gprs;
                const address = function() {
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
            function(rn: number, rm: number, condOp: IConditionOperator|null): ICPUAddress {
                const gprs = cpu.gprs;
                const address = function() {
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
            function(rn: number, rm: number, condOp: IConditionOperator|null): ICPUAddress{
                const gprs = cpu.gprs;
                const address = function() {
                    return gprs[rn] - gprs[rm];
                };
                address.writesPC = false;
                return address;
            },
    
            // IP0xW
            function(rn: number, rm: number, condOp: IConditionOperator|null): ICPUAddress {
                const gprs = cpu.gprs;
                const address = function() {
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
            function(rn: number, rm: number, condOp: IConditionOperator|null): ICPUAddress {
                const gprs = cpu.gprs;
                const address = function() {
                    const addr = gprs[rn] + gprs[rm];
                    return addr;
                };
                address.writesPC = false;
                return address;
            },
    
            // IPUxW
            function(rn: number, rm: number, condOp: IConditionOperator|null): ICPUAddress {
                const gprs = cpu.gprs;
                const address = function() {
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
            function(rn: number, shiftOp:ICPUOperator, condOp:IConditionOperator|null):ICPUAddress {
                const gprs = cpu.gprs;
                const address = function() {
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
            function(rn: number, shiftOp:ICPUOperator, condOp:IConditionOperator|null):ICPUAddress {
                const gprs = cpu.gprs;
                const address = function() {
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
            function(rn: number, shiftOp:ICPUOperator, condOp:IConditionOperator|null):ICPUAddress {
                const gprs = cpu.gprs;
                const address = function() {
                    shiftOp();
                    return gprs[rn] - cpu.shifterOperand;
                };
                address.writesPC = false;
                return address;
            },
    
            // IP0xW
            function(rn: number, shiftOp:ICPUOperator, condOp:IConditionOperator|null):ICPUAddress {
                const gprs = cpu.gprs;
                const address = function() {
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
            function(rn: number, shiftOp:ICPUOperator, condOp:IConditionOperator|null):ICPUAddress {
                const gprs = cpu.gprs;
                const address = function() {
                    shiftOp();
                    return gprs[rn] + cpu.shifterOperand;
                };
                address.writesPC = false;
                return address;
            },
    
            // IPUxW
            function(rn: number, shiftOp:ICPUOperator, condOp:IConditionOperator|null):ICPUAddress {
                const gprs = cpu.gprs;
                const address = function() {
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
    constructAddressingMode1ASR(rs: number, rm: number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function():void {
            ++cpu.cycles;
            var shift = gprs[rs];
            if (rs == cpu.PC) {
                shift += 4;
            }
            shift &= 0xFF;
            var shiftVal =  gprs[rm];
            if (rm == cpu.PC) {
                shiftVal += 4;
            }
            if (shift == 0) {
                cpu.shifterOperand = shiftVal;
                cpu.shifterCarryOut = cpu.cpsrC;
            } else if (shift < 32) {
                cpu.shifterOperand = shiftVal >> shift;
                cpu.shifterCarryOut = shiftVal & (1 << (shift - 1));
            } else if (gprs[rm] >> 31) {
                cpu.shifterOperand = 0xFFFFFFFF;
                cpu.shifterCarryOut = 0x80000000;
            } else {
                cpu.shifterOperand = 0;
                cpu.shifterCarryOut = 0;
            }
        };
    }
    
    /**
     * 
     * @param immediate 
     */
    constructAddressingMode1Immediate(immediate: number): IInstruction {
        const cpu = this.cpu;
        return function() {
            cpu.shifterOperand = immediate;
            cpu.shifterCarryOut = cpu.cpsrC;
        };
    }
    
    /**
     * 
     * @param immediate 
     * @param rotate 
     */
    constructAddressingMode1ImmediateRotate(immediate: number, rotate: number): IInstruction {
        const cpu = this.cpu;
        return function() {
            cpu.shifterOperand = (immediate >>> rotate) | (immediate << (32 - rotate));
            cpu.shifterCarryOut = cpu.shifterOperand >> 31;
        }
    }

    /**
     * 
     * @param rs 
     * @param rm 
     */
    constructAddressingMode1LSL(rs: number, rm: number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            ++cpu.cycles;
            var shift = gprs[rs];
            if (rs == cpu.PC) {
                shift += 4;
            }
            shift &= 0xFF;
            var shiftVal =  gprs[rm];
            if (rm == cpu.PC) {
                shiftVal += 4;
            }
            if (shift == 0) {
                cpu.shifterOperand = shiftVal;
                cpu.shifterCarryOut = cpu.cpsrC;
            } else if (shift < 32) {
                cpu.shifterOperand = shiftVal << shift;
                cpu.shifterCarryOut = shiftVal & (1 << (32 - shift));
            } else if (shift == 32) {
                cpu.shifterOperand = 0;
                cpu.shifterCarryOut = shiftVal & 1;
            } else {
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
    constructAddressingMode1LSR(rs: number, rm: number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            ++cpu.cycles;
            var shift = gprs[rs];
            if (rs == cpu.PC) {
                shift += 4;
            }
            shift &= 0xFF;
            var shiftVal =  gprs[rm];
            if (rm == cpu.PC) {
                shiftVal += 4;
            }
            if (shift == 0) {
                cpu.shifterOperand = shiftVal;
                cpu.shifterCarryOut = cpu.cpsrC;
            } else if (shift < 32) {
                cpu.shifterOperand = shiftVal >>> shift;
                cpu.shifterCarryOut = shiftVal & (1 << (shift - 1));
            } else if (shift == 32) {
                cpu.shifterOperand = 0;
                cpu.shifterCarryOut = shiftVal >> 31;
            } else {
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
    constructAddressingMode1ROR(rs: number, rm: number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            ++cpu.cycles;
            var shift = gprs[rs];
            if (rs == cpu.PC) {
                shift += 4;
            }
            shift &= 0xFF;
            var shiftVal =  gprs[rm];
            if (rm == cpu.PC) {
                shiftVal += 4;
            }
            var rotate = shift & 0x1F;
            if (shift == 0) {
                cpu.shifterOperand = shiftVal;
                cpu.shifterCarryOut = cpu.cpsrC;
            } else if (rotate) {
                cpu.shifterOperand = (gprs[rm] >>> rotate) | (gprs[rm] << (32 - rotate));
                cpu.shifterCarryOut = shiftVal & (1 << (rotate - 1));
            } else {
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
    constructAddressingMode23Immediate(instruction: number, immediate: number, condOp:IConditionOperator): ICPUAddress {
        const rn = (instruction & 0x000F0000) >> 16;
        const address = this.addressingMode23Immediate[(instruction & 0x01A00000) >> 21];
        if(!address){
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
    constructAddressingMode23Register(instruction: number, rm: number, condOp:IConditionOperator): ICPUAddress {
        const rn = (instruction & 0x000F0000) >> 16;
        const address = this.addressingMode23Register[(instruction & 0x01A00000) >> 21];
        if(!address){
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
    constructAddressingMode2RegisterShifted(instruction: number, shiftOp: ICPUOperator, condOp:IConditionOperator): ICPUAddress {
        const rn = (instruction & 0x000F0000) >> 16;
        const address = this.addressingMode2RegisterShifted[(instruction & 0x01A00000) >> 21];
        if(!address){
            throw new Error("invliad address");
        }                
        return address(rn, shiftOp, condOp);
    }
    
    /**
     * 
     */
    constructAddressingMode4(immediate:number, rn: number): IInstruction {
        const gprs = this.cpu.gprs;
        return function() {
            return gprs[rn] + immediate;
        }
    }
    
    constructAddressingMode4Writeback(immediate: number, offset: number, rn: number, overlap: boolean) {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function(writeInitial: boolean): number {
            var addr = gprs[rn] + immediate;
            if (writeInitial && overlap) {
                cpu.mmu.store32(gprs[rn] + immediate - 4, gprs[rn]);
            }
            gprs[rn] += offset;
            return addr;
        }
    }
    
    /**
     * ADC
     */
    constructADC(rd: number, rn: number, shiftOp: ICPUOperator, condOp:IConditionOperator|null): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            shiftOp();
            const shifterOperand = (cpu.shifterOperand >>> 0) + (!!cpu.cpsrC?1:0);
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
    constructADCS(rd: number, rn: number, shiftOp: ICPUOperator, condOp:IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            shiftOp();
            var shifterOperand = (cpu.shifterOperand >>> 0) + (!!cpu.cpsrC?1:0);
            var d = (gprs[rn] >>> 0) + shifterOperand;
            if (rd == cpu.PC && cpu.hasSPSR()) {
                cpu.unpackCPSR(cpu.spsr);
            } else {
                cpu.cpsrN = d >> 31;
                cpu.cpsrZ = !(d & 0xFFFFFFFF)?1:0;
                cpu.cpsrC = (d > 0xFFFFFFFF?1:0);
                cpu.cpsrV = ((gprs[rn] >> 31) == (shifterOperand >> 31) &&
                            (gprs[rn] >> 31) != (d >> 31) &&
                            (shifterOperand >> 31) != (d >> 31)?1:0);
            }
            gprs[rd] = d;
        };
    };
    
    /**
     * ADD
     * @param rd 目的暫存器
     * @param rn 
     * @param shiftOp 
     * @param condOp 
     * @see https://developer.arm.com/docs/100076/0200/a32t32-instruction-set-reference/a32-and-t32-instructions/add
     */
    constructADD(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructADDS(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            shiftOp();
            var d = (gprs[rn] >>> 0) + (cpu.shifterOperand >>> 0);
            if (rd == cpu.PC && cpu.hasSPSR()) {
                cpu.unpackCPSR(cpu.spsr);
            } else {
                cpu.cpsrN = d >> 31;
                cpu.cpsrZ = (!(d & 0xFFFFFFFF))?1:0;
                cpu.cpsrC = (d > 0xFFFFFFFF)?1:0;
                cpu.cpsrV = ((gprs[rn] >> 31) == (cpu.shifterOperand >> 31) &&
                            (gprs[rn] >> 31) != (d >> 31) &&
                            (cpu.shifterOperand >> 31) != (d >> 31))?1:0;
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
    constructAND(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            shiftOp();
            gprs[rd] = gprs[rn] & cpu.shifterOperand;
        };
    };
    
    constructANDS(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            shiftOp();
            gprs[rd] = gprs[rn] & cpu.shifterOperand;
            if (rd == cpu.PC && cpu.hasSPSR()) {
                cpu.unpackCPSR(cpu.spsr);
            } else {
                cpu.cpsrN = gprs[rd] >> 31;
                cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF))?1:0;
                cpu.cpsrC = cpu.shifterCarryOut;
            }
        };
    };
    
    /**
     * 
     * @param immediate 
     * @param condOp 
     */
    constructB(immediate: number, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructBIC(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            shiftOp();
            gprs[rd] = gprs[rn] & ~cpu.shifterOperand;
        };
    }
    
    constructBICS(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            shiftOp();
            gprs[rd] = gprs[rn] & ~cpu.shifterOperand;
            if (rd == cpu.PC && cpu.hasSPSR()) {
                cpu.unpackCPSR(cpu.spsr);
            } else {
                cpu.cpsrN = gprs[rd] >> 31;
                cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF))?1:0;
                cpu.cpsrC = cpu.shifterCarryOut;
            }
        };
    }
    
    /**
     * 
     * @param immediate 
     * @param condOp 
     */
    constructBL(immediate: number, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructBX(rm: number, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructCMN(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            shiftOp();
            var aluOut = (gprs[rn] >>> 0) + (cpu.shifterOperand >>> 0);
            cpu.cpsrN = aluOut >> 31;
            cpu.cpsrZ = (!(aluOut & 0xFFFFFFFF))?1:0;
            cpu.cpsrC = (aluOut > 0xFFFFFFFF)?1:0;
            cpu.cpsrV = ((gprs[rn] >> 31) == (cpu.shifterOperand >> 31) &&
                        (gprs[rn] >> 31) != (aluOut >> 31) &&
                        (cpu.shifterOperand >> 31) != (aluOut >> 31))?1:0;
        };
    }
    
    /**
     * CMP
     * @param rd 
     * @param rn 
     * @param shiftOp 
     * @param condOp 
     */
    constructCMP(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            shiftOp();
            const aluOut = gprs[rn] - cpu.shifterOperand;
            cpu.cpsrN = aluOut >> 31;
            cpu.cpsrZ = (!(aluOut & 0xFFFFFFFF))?1:0;
            cpu.cpsrC = ((gprs[rn] >>> 0) >= (cpu.shifterOperand >>> 0))?1:0;
            cpu.cpsrV = ((gprs[rn] >> 31) != (cpu.shifterOperand >> 31) &&
                        (gprs[rn] >> 31) != (aluOut >> 31))?1:0;
        };
    }
    
    /**
     * 
     * @param rd 
     * @param rn 
     * @param shiftOp 
     * @param condOp 
     */
    constructEOR(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            shiftOp();
            gprs[rd] = gprs[rn] ^ cpu.shifterOperand;
        };
    };
    
    /**
     * EORS
     * @param rd 
     * @param rn 
     * @param shiftOp 
     * @param condOp 
     */
    constructEORS(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            shiftOp();
            gprs[rd] = gprs[rn] ^ cpu.shifterOperand;
            if (rd == cpu.PC && cpu.hasSPSR()) {
                cpu.unpackCPSR(cpu.spsr);
            } else {
                cpu.cpsrN = gprs[rd] >> 31;
                cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF))?1:0;
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
    constructLDM(rs: number, address: ICPUAddress2, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        const mmu = cpu.mmu;
        return function() {
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
    constructLDMS(rs: number, address: ICPUAddress2, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        const mmu = cpu.mmu;
        return function() {
            mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            let addr: number = address(false);
            let total: number = 0;
            const mode = cpu.mode;
            cpu.switchMode(ARMMode.System);
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
    constructLDR(rd: number, address: ICPUAddress, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            const addr: number = address();
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
    constructLDRB(rd: number, address: ICPUAddress, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructLDRH(rd: number, address: ICPUAddress, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructLDRSB(rd: number, address: ICPUAddress, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructLDRSH(rd: number, address: ICPUAddress, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructMLA(rd: number, rn: number, rs: number, rm: number, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
            } else {
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
    constructMLAS(rd: number, rn: number, rs: number, rm: number, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
            } else {
                gprs[rd] = gprs[rm] * gprs[rs] + gprs[rn];
            }
            cpu.cpsrN = gprs[rd] >> 31;
            cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF))?1:0;
        };
    }
    
    /**
     * MOV
     * @param rd 
     * @param rn 
     * @param shiftOp 
     * @param condOp 
     */
    constructMOV(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructMOVS(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            shiftOp();
            gprs[rd] = cpu.shifterOperand;
            if (rd == cpu.PC && cpu.hasSPSR()) {
                cpu.unpackCPSR(cpu.spsr);
            } else {
                cpu.cpsrN = gprs[rd] >> 31;
                cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF))?1:0;
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
    constructMRS(rd: number, r: boolean, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            if (r) {
                gprs[rd] = cpu.spsr;
            } else {
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
    constructMSR(rm: number, r: boolean, instruction: number, immediate: number, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        const c = instruction & 0x00010000;
        const f = instruction & 0x00080000;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            let operand: number;
            if (instruction & 0x02000000) {
                operand = immediate;
            } else {
                operand = gprs[rm];
            }
            let mask = (c ? 0x000000FF : 0x00000000) |
                       //(x ? 0x0000FF00 : 0x00000000) | // Irrelevant on ARMv4T
                       //(s ? 0x00FF0000 : 0x00000000) | // Irrelevant on ARMv4T
                       (f ? 0xFF000000 : 0x00000000);
    
            if (r) {
                mask &= cpu.USER_MASK | cpu.PRIV_MASK | cpu.STATE_MASK;
                cpu.spsr = (cpu.spsr & ~mask) | (operand & mask);
            } else {
                if (mask & cpu.USER_MASK) {
                    cpu.cpsrN = operand >> 31;
                    cpu.cpsrZ = operand & 0x40000000;
                    cpu.cpsrC = operand & 0x20000000;
                    cpu.cpsrV = operand & 0x10000000;
                }
                if (cpu.mode != ARMMode.User && (mask & cpu.PRIV_MASK)) {
                    cpu.switchMode((operand & 0x0000000F) | 0x00000010);
                    cpu.cpsrI = operand & 0x00000080;
                    cpu.cpsrF = operand & 0x00000040;
                }
            }
        };
    }
    
    constructMUL(rd: number, rs: number, rm: number, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
            } else {
                gprs[rd] = gprs[rm] * gprs[rs];
            }
        };
    }
    
    constructMULS(rd: number, rs: number, rm: number, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
            } else {
                gprs[rd] = gprs[rm] * gprs[rs];
            }
            cpu.cpsrN = gprs[rd] >> 31;
            cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF))?1:0;
        };
    }
    
    /**
     * 
     * @param rd 
     * @param rn 
     * @param shiftOp 
     * @param condOp 
     */
    constructMVN(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            shiftOp();
            gprs[rd] = ~cpu.shifterOperand;
        };
    }
    
    constructMVNS(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            shiftOp();
            gprs[rd] = ~cpu.shifterOperand;
            if (rd == cpu.PC && cpu.hasSPSR()) {
                cpu.unpackCPSR(cpu.spsr);
            } else {
                cpu.cpsrN = gprs[rd] >> 31;
                cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF))?1:0;
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
    constructORR(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            shiftOp();
            gprs[rd] = gprs[rn] | cpu.shifterOperand;
        }
    }
    
    /**
     * ORRS
     * @param rd 
     * @param rn 
     * @param shiftOp 
     * @param condOp 
     */
    constructORRS(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator) : IInstruction{
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            shiftOp();
            gprs[rd] = gprs[rn] | cpu.shifterOperand;
            if (rd == cpu.PC && cpu.hasSPSR()) {
                cpu.unpackCPSR(cpu.spsr);
            } else {
                cpu.cpsrN = gprs[rd] >> 31;
                cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF))?1:0;
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
    constructRSB(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            shiftOp();
            gprs[rd] = cpu.shifterOperand - gprs[rn];
        };
    };
    
    /**
     * RSBS
     * @param rd 
     * @param rn 
     * @param shiftOp 
     * @param condOp 
     */
    constructRSBS(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            shiftOp();
            var d = cpu.shifterOperand - gprs[rn];
            if (rd == cpu.PC && cpu.hasSPSR()) {
                cpu.unpackCPSR(cpu.spsr);
            } else {
                cpu.cpsrN = d >> 31;
                cpu.cpsrZ = (!(d & 0xFFFFFFFF))?1:0;
                cpu.cpsrC = ((cpu.shifterOperand >>> 0) >= (gprs[rn] >>> 0))?1:0;
                cpu.cpsrV = ((cpu.shifterOperand >> 31) != (gprs[rn] >> 31) &&
                            (cpu.shifterOperand >> 31) != (d >> 31))?1:0;
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
    constructRSC(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            shiftOp();
            const n = (gprs[rn] >>> 0) + (!cpu.cpsrC?1:0);
            gprs[rd] = (cpu.shifterOperand >>> 0) - n;
        };
    }
    
    constructRSCS(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            shiftOp();
            var n = (gprs[rn] >>> 0) + (!cpu.cpsrC?1:0);
            var d = (cpu.shifterOperand >>> 0) - n;
            if (rd == cpu.PC && cpu.hasSPSR()) {
                cpu.unpackCPSR(cpu.spsr);
            } else {
                cpu.cpsrN = d >> 31;
                cpu.cpsrZ = (!(d & 0xFFFFFFFF))?1:0;
                cpu.cpsrC = ((cpu.shifterOperand >>> 0) >= (d >>> 0))?1:0;
                cpu.cpsrV = ((cpu.shifterOperand >> 31) != (n >> 31) &&
                            (cpu.shifterOperand >> 31) != (d >> 31))?1:0;
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
    constructSBC(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            shiftOp();
            var shifterOperand = (cpu.shifterOperand >>> 0) + (!cpu.cpsrC?1:0);
            gprs[rd] = (gprs[rn] >>> 0) - shifterOperand;
        };
    }
    
    constructSBCS(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            shiftOp();
            var shifterOperand = (cpu.shifterOperand >>> 0) + (!cpu.cpsrC?1:0);
            var d = (gprs[rn] >>> 0) - shifterOperand;
            if (rd == cpu.PC && cpu.hasSPSR()) {
                cpu.unpackCPSR(cpu.spsr);
            } else {
                cpu.cpsrN = d >> 31;
                cpu.cpsrZ = (!(d & 0xFFFFFFFF))?1:0;
                cpu.cpsrC = ((gprs[rn] >>> 0) >= (d >>> 0)?1:0);
                cpu.cpsrV = ((gprs[rn] >> 31) != (shifterOperand >> 31) &&
                            (gprs[rn] >> 31) != (d >> 31)?1:0);
            }
            gprs[rd] = d;
        };
    }
    
    constructSMLAL(rd: number, rn: number, rs: number, rm: number, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
            gprs[rd] += Math.floor(carry * SHIFT_32);
        };
    }
    
    constructSMLALS(rd: number, rn: number, rs: number, rm: number, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
            gprs[rd] += Math.floor(carry * SHIFT_32);
            cpu.cpsrN = gprs[rd] >> 31;
            cpu.cpsrZ = (!((gprs[rd] & 0xFFFFFFFF) || (gprs[rn] & 0xFFFFFFFF)))?1:0;
        };
    };
    
    /**
     * SMULL
     * @param rd 
     * @param rn 
     * @param rs 
     * @param rm 
     * @param condOp 
     */
    constructSMULL(rd: number, rn: number, rs: number, rm: number, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            ++cpu.cycles;
            cpu.mmu.waitMul(gprs[rs]);
            var hi = ((gprs[rm] & 0xFFFF0000) >> 0) * (gprs[rs] >> 0);
            var lo = ((gprs[rm] & 0x0000FFFF) >> 0) * (gprs[rs] >> 0);
            gprs[rn] = ((hi & 0xFFFFFFFF) + (lo & 0xFFFFFFFF)) & 0xFFFFFFFF;
            gprs[rd] = Math.floor(hi * SHIFT_32 + lo * SHIFT_32);
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
    constructSMULLS(rd: number, rn: number, rs: number, rm: number, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            ++cpu.cycles;
            cpu.mmu.waitMul(gprs[rs]);
            var hi = ((gprs[rm] & 0xFFFF0000) >> 0) * (gprs[rs] >> 0);
            var lo = ((gprs[rm] & 0x0000FFFF) >> 0) * (gprs[rs] >> 0);
            gprs[rn] = ((hi & 0xFFFFFFFF) + (lo & 0xFFFFFFFF)) & 0xFFFFFFFF;
            gprs[rd] = Math.floor(hi * SHIFT_32 + lo * SHIFT_32);
            cpu.cpsrN = gprs[rd] >> 31;
            cpu.cpsrZ = (!((gprs[rd] & 0xFFFFFFFF) || (gprs[rn] & 0xFFFFFFFF))?1:0);
        };
    }
    
    /**
     * STM
     * @param rs 
     * @param address 
     * @param condOp 
     */
    constructSTM(rs: number, address: ICPUAddress2, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        const mmu = cpu.mmu;
        return function() {
            if (condOp && !condOp()) {
                mmu.waitPrefetch32(gprs[cpu.PC]);
                return;
            }
            mmu.wait32(gprs[cpu.PC]);
            let addr: number = address(true);
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
    constructSTMS(rs: number, address: ICPUAddress2, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        const mmu = cpu.mmu;
        return function() {
            if (condOp && !condOp()) {
                mmu.waitPrefetch32(gprs[cpu.PC]);
                return;
            }
            mmu.wait32(gprs[cpu.PC]);
            const mode = cpu.mode;
            let addr = address(true);
            let total = 0;
            let m, i;
            cpu.switchMode(ARMMode.System);
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
    constructSTR(rd: number, address: ICPUAddress, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructSTRB(rd: number, address: ICPUAddress, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructSTRH(rd: number, address: ICPUAddress, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructSUB(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructSUBS(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            shiftOp();
            var d = gprs[rn] - cpu.shifterOperand;
            if (rd == cpu.PC && cpu.hasSPSR()) {
                cpu.unpackCPSR(cpu.spsr);
            } else {
                cpu.cpsrN = d >> 31;
                cpu.cpsrZ = !(d & 0xFFFFFFFF)?1:0;
                cpu.cpsrC = (gprs[rn] >>> 0) >= (cpu.shifterOperand >>> 0)?1:0;
                cpu.cpsrV = ((gprs[rn] >> 31) != (cpu.shifterOperand >> 31) &&
                            (gprs[rn] >> 31) != (d >> 31))?1:0;
            }
            gprs[rd] = d;
        };
    }
    
    /**
     * SWI
     * @param immediate 
     * @param condOp 
     */
    constructSWI(immediate: number, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructSWP(rd: number, rn: number, rm: number, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
        }
    }
    
    /**
     * SWPB
     * @param rd 
     * @param rn 
     * @param rm 
     * @param condOp 
     */
    constructSWPB(rd: number, rn: number, rm: number, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
        }
    }
    
    /**
     * 
     * @param rd 
     * @param rn 
     * @param shiftOp 
     * @param condOp 
     */
    constructTEQ(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            shiftOp();
            const aluOut = gprs[rn] ^ cpu.shifterOperand;
            cpu.cpsrN = aluOut >> 31;
            cpu.cpsrZ = !(aluOut & 0xFFFFFFFF)?1:0;
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
    constructTST(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            shiftOp();
            const aluOut = gprs[rn] & cpu.shifterOperand;
            cpu.cpsrN = aluOut >> 31;
            cpu.cpsrZ = !(aluOut & 0xFFFFFFFF)?1:0;
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
    constructUMLAL(rd: number, rn: number, rs: number, rm: number, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
            gprs[rd] += carry * SHIFT_32;
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
    constructUMLALS(rd: number, rn: number, rs: number, rm: number, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
            gprs[rd] += carry * SHIFT_32;
            cpu.cpsrN = gprs[rd] >> 31;
            cpu.cpsrZ = !((gprs[rd] & 0xFFFFFFFF) || (gprs[rn] & 0xFFFFFFFF))?1:0;
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
    constructUMULL(rd: number, rn: number, rs: number, rm: number, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            ++cpu.cycles;
            cpu.mmu.waitMul(gprs[rs]);
            const hi = ((gprs[rm] & 0xFFFF0000) >>> 0) * (gprs[rs] >>> 0);
            const lo = ((gprs[rm] & 0x0000FFFF) >>> 0) * (gprs[rs] >>> 0);
            gprs[rn] = ((hi & 0xFFFFFFFF) + (lo & 0xFFFFFFFF)) & 0xFFFFFFFF;
            gprs[rd] = ( (hi+lo) * SHIFT_32) >>> 0;
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
    constructUMULLS(rd: number, rn: number, rs: number, rm: number, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
            if (condOp && !condOp()) {
                return;
            }
            ++cpu.cycles;
            cpu.mmu.waitMul(gprs[rs]);
            const hi = ((gprs[rm] & 0xFFFF0000) >>> 0) * (gprs[rs] >>> 0);
            const lo = ((gprs[rm] & 0x0000FFFF) >>> 0) * (gprs[rs] >>> 0);
            gprs[rn] = ((hi & 0xFFFFFFFF) + (lo & 0xFFFFFFFF)) & 0xFFFFFFFF;
            gprs[rd] = ((hi + lo)* SHIFT_32) >>> 0;
            cpu.cpsrN = gprs[rd] >> 31;
            cpu.cpsrZ = !((gprs[rd] & 0xFFFFFFFF) || (gprs[rn] & 0xFFFFFFFF))?1:0;
        };
    }
}