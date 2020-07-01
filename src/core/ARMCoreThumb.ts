import {ICompilerThumb, ICPU, IIRQ, IConditionOperator, IInstruction} from "../interfaces.ts";

/**
 * ARM Thumb 指令集
 */
export default class ARMCoreThumb implements ICompilerThumb {
    cpu: ICPU
    constructor(cpu: ICPU){
        this.cpu = cpu;    
    }

    /**
     * ADC
     * @param rd 
     * @param rm 
     */
    constructADC(rd: number, rm: number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            const m = (gprs[rm] >>> 0) + (!!cpu.cpsrC?1:0);
            const oldD = gprs[rd];
            const d = (oldD >>> 0) + m;
            const oldDn = oldD >> 31;
            const dn = d >> 31;
            const mn = m >> 31;
            cpu.cpsrN = dn;
            cpu.cpsrZ = (!(d & 0xFFFFFFFF))?1:0;
            cpu.cpsrC = (d > 0xFFFFFFFF)?1:0;
            cpu.cpsrV = (oldDn == mn && oldDn != dn && mn != dn)?1:0;
            gprs[rd] = d;
        };
    }
    
    /**
     * ADD1
     * @param rd 
     * @param rn 
     * @param immediate 
     */
    constructADD1(rd: number, rn: number, immediate: number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            const d = (gprs[rn] >>> 0) + immediate;
            cpu.cpsrN = d >> 31;
            cpu.cpsrZ = (!(d & 0xFFFFFFFF))?1:0;
            cpu.cpsrC = (d > 0xFFFFFFFF)?1:0;
            cpu.cpsrV = (!(gprs[rn] >> 31) && ((gprs[rn] >> 31 ^ d) >> 31) && (d >> 31))?1:0;
            gprs[rd] = d;
        };
    }
    
    /**
     * ADD2
     * @param rn 
     * @param immediate 
     */
    constructADD2(rn: number, immediate: number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            const d = (gprs[rn] >>> 0) + immediate;
            cpu.cpsrN = d >> 31;
            cpu.cpsrZ = (!(d & 0xFFFFFFFF))?1:0;
            cpu.cpsrC = (d > 0xFFFFFFFF)?1:0;
            cpu.cpsrV = (!(gprs[rn] >> 31) && ((gprs[rn] ^ d) >> 31) && ((immediate ^ d) >> 31))?1:0;
            gprs[rn] = d;
        };
    }
    
    /**
     * ADD3
     * @param rd 
     * @param rn 
     * @param rm 
     */
    constructADD3(rd: number, rn: number, rm: number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            const d = (gprs[rn] >>> 0) + (gprs[rm] >>> 0);
            cpu.cpsrN = d >> 31;
            cpu.cpsrZ = (!(d & 0xFFFFFFFF))?1:0;
            cpu.cpsrC = (d > 0xFFFFFFFF)?1:0;
            cpu.cpsrV = (!((gprs[rn] ^ gprs[rm]) >> 31) && ((gprs[rn] ^ d) >> 31) && ((gprs[rm] ^ d) >> 31))?1:0;
            gprs[rd] = d;
        };
    }
    
    /**
     * ADD4
     * @param rd 
     * @param rm 
     */
    constructADD4(rd: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            gprs[rd] += gprs[rm];
        };
    }
    
    /**
     * ADD5
     * @param rd 
     * @param immediate 
     */
    constructADD5(rd: number, immediate: number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            gprs[rd] = (gprs[cpu.PC] & 0xFFFFFFFC) + immediate;
        };
    }
    
    /**
     * ADD6
     * @param rd 
     * @param immediate 
     */
    constructADD6(rd: number, immediate: number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            gprs[rd] = gprs[cpu.SP] + immediate;
        };
    }
    
    /**
     * ADD7
     * @param immediate 
     */
    constructADD7(immediate: number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            gprs[cpu.SP] += immediate;
        };
    }
    
    /**
     * AND
     * @param rd 
     * @param rm 
     */
    constructAND(rd: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            gprs[rd] = gprs[rd] & gprs[rm];
            cpu.cpsrN = gprs[rd] >> 31;
            cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF))?1:0;
        };
    }
    
    /**
     * ASR1
     * @param rd 
     * @param rm 
     * @param immediate 
     */
    constructASR1(rd: number, rm:number, immediate: number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            if (immediate == 0) {
                cpu.cpsrC = gprs[rm] >> 31;
                if (cpu.cpsrC) {
                    gprs[rd] = 0xFFFFFFFF;
                } else {
                    gprs[rd] = 0;
                }
            } else {
                cpu.cpsrC = gprs[rm] & (1 << (immediate - 1));
                gprs[rd] = gprs[rm] >> immediate;
            }
            cpu.cpsrN = gprs[rd] >> 31;
            cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF))?1:0;
        };
    }
    
    /**
     * ASR2
     * @param rd 
     * @param rm 
     */
    constructASR2(rd: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            var rs = gprs[rm] & 0xFF;
            if (rs) {
                if (rs < 32) {
                    cpu.cpsrC = gprs[rd] & (1 << (rs - 1));
                    gprs[rd] >>= rs;
                } else {
                    cpu.cpsrC = gprs[rd] >> 31;
                    if (cpu.cpsrC) {
                        gprs[rd] = 0xFFFFFFFF;
                    } else {
                        gprs[rd] = 0;
                    }
                }
            }
            cpu.cpsrN = gprs[rd] >> 31;
            cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF))?1:0;
        };
    }
    
    /**
     * B1
     * @param immediate 
     * @param condOp 
     */
    constructB1(immediate: number, condOp: IConditionOperator): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructB2(immediate: number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            gprs[cpu.PC] += immediate;
        };
    }
    
    /**
     * BIC
     * @param rd 
     * @param rm 
     */
    constructBIC(rd: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            gprs[rd] = gprs[rd] & ~gprs[rm];
            cpu.cpsrN = gprs[rd] >> 31;
            cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF))?1:0;
        };
    }
    
    /**
     * BL1
     * @param immediate 
     */
    constructBL1(immediate:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            gprs[cpu.LR] = gprs[cpu.PC] + immediate;
        }
    }
    
    /**
     * BL2
     * @param immediate 
     */
    constructBL2(immediate:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            var pc = gprs[cpu.PC];
            gprs[cpu.PC] = gprs[cpu.LR] + (immediate << 1);
            gprs[cpu.LR] = pc - 1;
        }
    }
    
    /**
     * BX
     * @param rd 
     * @param rm 
     */
    constructBX(rd: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructCMN(rd: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            var aluOut = (gprs[rd] >>> 0) + (gprs[rm] >>> 0);
            cpu.cpsrN = aluOut >> 31;
            cpu.cpsrZ = (!(aluOut & 0xFFFFFFFF))?1:0;
            cpu.cpsrC = (aluOut > 0xFFFFFFFF)?1:0;
            cpu.cpsrV = ((gprs[rd] >> 31) == (gprs[rm] >> 31) &&
                        (gprs[rd] >> 31) != (aluOut >> 31) &&
                        (gprs[rm] >> 31) != (aluOut >> 31))?1:0;
        };
    }
    
    /**
     * CMP
     * @param rn 
     * @param immediate 
     */
    constructCMP1(rn: number, immediate: number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            var aluOut = gprs[rn] - immediate;
            cpu.cpsrN = aluOut >> 31;
            cpu.cpsrZ = (!(aluOut & 0xFFFFFFFF))?1:0;
            cpu.cpsrC = ((gprs[rn] >>> 0) >= immediate)?1:0;
            cpu.cpsrV = (gprs[rn] >> 31) && ((gprs[rn] ^ aluOut) >> 31);
        };
    }
    
    /**
     * CMP2
     * @param rd 
     * @param rm 
     */
    constructCMP2(rd: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            const d = gprs[rd];
            const m = gprs[rm];
            const aluOut = d - m;
            const an = aluOut >> 31;
            const dn = d >> 31;
            cpu.cpsrN = an;
            cpu.cpsrZ = (!(aluOut & 0xFFFFFFFF))?1:0;
            cpu.cpsrC = ((d >>> 0) >= (m >>> 0))?1:0;
            cpu.cpsrV = (dn != (m >> 31) && dn != an)?1:0;
        };
    }
    
    /**
     * CMP3
     * @param rd 
     * @param rm 
     */
    constructCMP3(rd: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            const aluOut = gprs[rd] - gprs[rm];
            cpu.cpsrN = aluOut >> 31;
            cpu.cpsrZ = (!(aluOut & 0xFFFFFFFF))?1:0;
            cpu.cpsrC = ((gprs[rd] >>> 0) >= (gprs[rm] >>> 0))?1:0;
            cpu.cpsrV = ((gprs[rd] ^ gprs[rm]) >> 31) && ((gprs[rd] ^ aluOut) >> 31);
        };
    }
    
    /**
     * EOR
     * @param rd 
     * @param rm 
     */
    constructEOR(rd: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            gprs[rd] = gprs[rd] ^ gprs[rm];
            cpu.cpsrN = gprs[rd] >> 31;
            cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF))?1:0;
        };
    }
    
    /**
     * DMIA
     * @param rn 
     * @param rs 
     */
    constructLDMIA(rn: number, rs: number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructLDR1(rd: number, rn: number, immediate: number) : IInstruction{
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructLDR2(rd: number, rn: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            gprs[rd] = cpu.mmu.load32(gprs[rn] + gprs[rm]);
            cpu.mmu.wait32(gprs[rn] + gprs[rm]);
            ++cpu.cycles;
        }
    }
    
    /**
     * LDR3
     * @param rd 
     * @param immediate 
     */
    constructLDR3(rd: number, immediate: number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructLDR4(rd: number, immediate: number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructLDRB1(rd: number, rn: number, immediate: number) : IInstruction{
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructLDRB2(rd: number, rn: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructLDRH1(rd: number, rn: number, immediate: number) : IInstruction{
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructLDRH2(rd: number, rn: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructLDRSB(rd: number, rn: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructLDRSH(rd: number, rn: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructLSL1(rd: number, rm:number, immediate: number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            if (immediate == 0) {
                gprs[rd] = gprs[rm];
            } else {
                cpu.cpsrC = gprs[rm] & (1 << (32 - immediate));
                gprs[rd] = gprs[rm] << immediate;
            }
            cpu.cpsrN = gprs[rd] >> 31;
            cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF))?1:0;
        };
    }
    
    /**
     * LSL2
     * @param rd 
     * @param rm 
     */
    constructLSL2(rd: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            const rs = gprs[rm] & 0xFF;
            if (rs) {
                if (rs < 32) {
                    cpu.cpsrC = gprs[rd] & (1 << (32 - rs));
                    gprs[rd] <<= rs;
                } else {
                    if (rs > 32) {
                        cpu.cpsrC = 0;
                    } else {
                        cpu.cpsrC = gprs[rd] & 0x00000001;
                    }
                    gprs[rd] = 0;
                }
            }
            cpu.cpsrN = gprs[rd] >> 31;
            cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF))?1:0;
        };
    }
    
    /**
     * LSR1
     * @param rd 
     * @param rm 
     * @param immediate 
     */
    constructLSR1(rd: number, rm:number, immediate: number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            if (immediate == 0) {
                cpu.cpsrC = gprs[rm] >> 31;
                gprs[rd] = 0;
            } else {
                cpu.cpsrC = gprs[rm] & (1 << (immediate - 1));
                gprs[rd] = gprs[rm] >>> immediate;
            }
            cpu.cpsrN = 0;
            cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF))?1:0;
        };
    }
    
    /**
     * LSR2
     * @param rd 
     * @param rm 
     */
    constructLSR2(rd: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            const rs = gprs[rm] & 0xFF;
            if (rs) {
                if (rs < 32) {
                    cpu.cpsrC = gprs[rd] & (1 << (rs - 1));
                    gprs[rd] >>>= rs;
                } else {
                    if (rs > 32) {
                        cpu.cpsrC = 0;
                    } else {
                        cpu.cpsrC = gprs[rd] >> 31;
                    }
                    gprs[rd] = 0;
                }
            }
            cpu.cpsrN = gprs[rd] >> 31;
            cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF))?1:0;
        };
    };
    
    /**
     * MOV1
     * @param rn 
     * @param immediate 
     */
    constructMOV1(rn: number, immediate: number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            gprs[rn] = immediate;
            cpu.cpsrN = immediate >> 31;
            cpu.cpsrZ = (!(immediate & 0xFFFFFFFF))?1:0;
        };
    }
    
    /**
     * MOV2
     * @param rd 
     * @param rn 
     * @param rm 
     */
    constructMOV2(rd: number, rn: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            const d = gprs[rn];
            cpu.cpsrN = d >> 31;
            cpu.cpsrZ = (!(d & 0xFFFFFFFF))?1:0;
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
    constructMOV3(rd: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            gprs[rd] = gprs[rm];
        };
    }
    
    /**
     * MUL
     * @param rd 
     * @param rm 
     */
    constructMUL(rd: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            cpu.mmu.waitMul(gprs[rm]);
            if ((gprs[rm] & 0xFFFF0000) && (gprs[rd] & 0xFFFF0000)) {
                // Our data type is a double--we'll lose bits if we do it all at once!
                const hi = ((gprs[rd] & 0xFFFF0000) * gprs[rm]) & 0xFFFFFFFF;
                const lo = ((gprs[rd] & 0x0000FFFF) * gprs[rm]) & 0xFFFFFFFF;
                gprs[rd] = (hi + lo) & 0xFFFFFFFF;
            } else {
                gprs[rd] *= gprs[rm];
            }
            cpu.cpsrN = gprs[rd] >> 31;
            cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF))?1:0;
        };
    }
    
    /**
     * MVN
     * @param rd 
     * @param rm 
     */
    constructMVN(rd: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            gprs[rd] = ~gprs[rm];
            cpu.cpsrN = gprs[rd] >> 31;
            cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF))?1:0;
        };
    }
    
    /**
     * NEG
     * @param rd 
     * @param rm 
     */
    constructNEG(rd: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            const d = -gprs[rm];
            cpu.cpsrN = d >> 31;
            cpu.cpsrZ = (!(d & 0xFFFFFFFF))?1:0;
            cpu.cpsrC = (0 >= (d >>> 0))?1:0;
            cpu.cpsrV = (gprs[rm] >> 31) && (d >> 31);
            gprs[rd] = d;
        };
    }
    
    /**
     * ORR
     * @param rd 
     * @param rm 
     */
    constructORR(rd: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            gprs[rd] = gprs[rd] | gprs[rm];
            cpu.cpsrN = gprs[rd] >> 31;
            cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF))?1:0;
        };
    };
    
    /**
     * POP
     * @param rs 
     * @param r 
     */
    constructPOP(rs: number, r: boolean): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructPUSH(rs: number, r: boolean): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructROR(rd: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            var rs = gprs[rm] & 0xFF;
            if (rs) {
                var r4 = rs & 0x1F;
                if (r4 > 0) {
                    cpu.cpsrC = gprs[rd] & (1 << (r4 - 1));
                    gprs[rd] = (gprs[rd] >>> r4) | (gprs[rd] << (32 - r4));
                } else {
                    cpu.cpsrC = gprs[rd] >> 31;
                }
            }
            cpu.cpsrN = gprs[rd] >> 31;
            cpu.cpsrZ = (!(gprs[rd] & 0xFFFFFFFF))?1:0;
        };
    }
    
    /**
     * SBC
     * @param rd 
     * @param rm 
     */
    constructSBC(rd: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            const m = (gprs[rm] >>> 0) + (cpu.cpsrC>0?1:0);
            const d = (gprs[rd] >>> 0) - m;
            cpu.cpsrN = d >> 31;
            cpu.cpsrZ = (!(d & 0xFFFFFFFF))?1:0;
            cpu.cpsrC = ((gprs[rd] >>> 0) >= (d >>> 0))?1:0;
            cpu.cpsrV = ((gprs[rd] ^ m) >> 31) && ((gprs[rd] ^ d) >> 31);
            gprs[rd] = d;
        };
    }
    
    /**
     * STMIA
     * @param rn 
     * @param rs 
     */
    constructSTMIA(rn: number, rs: number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructSTR1(rd: number, rn: number, immediate: number) : IInstruction{
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructSTR2(rd: number, rn: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructSTR3(rd: number, immediate: number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructSTRB1(rd: number, rn: number, immediate: number) : IInstruction{
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructSTRB2(rd: number, rn: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.store8(gprs[rn] + gprs[rm], gprs[rd]);
            cpu.mmu.wait(gprs[cpu.PC]);
            cpu.mmu.wait(gprs[rn] + gprs[rm]);
        }
    }
    
    /**
     * 
     * @param rd 
     * @param rn 
     * @param immediate 
     */
    constructSTRH1(rd: number, rn: number, immediate: number) : IInstruction{
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
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
    constructSTRH2(rd: number, rn: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.store16(gprs[rn] + gprs[rm], gprs[rd]);
            cpu.mmu.wait(gprs[cpu.PC]);
            cpu.mmu.wait(gprs[rn] + gprs[rm]);
        }
    }
    
    /**
     * 
     * @param rd 
     * @param rn 
     * @param immediate 
     */
    constructSUB1(rd: number, rn: number, immediate: number) : IInstruction{
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            const d = gprs[rn] - immediate;
            cpu.cpsrN = d >> 31;
            cpu.cpsrZ = (!(d & 0xFFFFFFFF))?1:0;
            cpu.cpsrC = ((gprs[rn] >>> 0) >= immediate)?1:0;
            cpu.cpsrV = (gprs[rn] >> 31) && ((gprs[rn] ^ d) >> 31);
            gprs[rd] = d;
        };
    }
    
    /**
     * 
     * @param rn 
     * @param immediate 
     */
    constructSUB2(rn: number, immediate: number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            var d = gprs[rn] - immediate;
            cpu.cpsrN = d >> 31;
            cpu.cpsrZ = (!(d & 0xFFFFFFFF))?1:0;
            cpu.cpsrC = ((gprs[rn] >>> 0) >= immediate)?1:0;
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
    constructSUB3(rd: number, rn: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            const d = gprs[rn] - gprs[rm];
            cpu.cpsrN = d >> 31;
            cpu.cpsrZ = (!(d & 0xFFFFFFFF))?1:0;
            cpu.cpsrC = ((gprs[rn] >>> 0) >= (gprs[rm] >>> 0))?1:0;
            cpu.cpsrV = ((gprs[rn] >> 31) != (gprs[rm] >> 31) &&
                        (gprs[rn] >> 31) != (d >> 31))?1:0;
            gprs[rd] = d;
        };
    }
    
    /**
     * SWI
     * @param immediate 
     */
    constructSWI(immediate: number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            (cpu.irq as IIRQ).swi(immediate);
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
        }
    }
    
    /**
     * 
     * @param rd 
     * @param rm 
     */
    constructTST(rd: number, rm:number): IInstruction {
        const cpu = this.cpu;
        const gprs = cpu.gprs;
        return function() {
            cpu.mmu.waitPrefetch(gprs[cpu.PC]);
            var aluOut = gprs[rd] & gprs[rm];
            cpu.cpsrN = aluOut >> 31;
            cpu.cpsrZ = (!(aluOut & 0xFFFFFFFF))?1:0;
        };
    }
}