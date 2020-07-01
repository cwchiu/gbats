import {
    IGBAMMU, IContext, IIRQ, ICPU, ICacheData, ICompilerArm, ICompilerThumb, IOp, IClose, ICloseData,
    OpExecMode, ARMMode, ARMBank, IConditionOperator, IBIOS, ICPUOperator, IInstruction,
    NumberHashtable, ICPUAddress, IClear
} from "../interfaces.ts";
import ARMCoreArm from "./ARMCoreArm.ts";
import ARMCoreThumb from "./ARMCoreThumb.ts";

interface ILoadInstruction {
    (address: number): IOp
}

enum BaseAddress {
    RESET = 0x00000000,
    UNDEF = 0x00000004,
    SWI = 0x00000008,
    PABT = 0x0000000C,
    DABT = 0x00000010,
    IRQ = 0x00000018,
    FIQ = 0x0000001C
}

/**
 * ARM 核心
 */
export default class ARMCore implements ICPU, IClose {
    SP: number = 13
    LR: number = 14
    PC: number = 15


    page: ICacheData | null = null
    conds: Array<IConditionOperator | null> = []
    pageMask: number = 0
    loadInstruction: ILoadInstruction = this.loadInstructionArm

    UNALLOC_MASK: number = 0x0FFFFF00
    USER_MASK: number = 0xF0000000
    PRIV_MASK: number = 0x000000CF // This is out of spec, but it seems to be what's done in other implementations
    STATE_MASK: number = 0x00000020

    static readonly WORD_SIZE_ARM: number = 4
    static readonly WORD_SIZE_THUMB: number = 2

    // 0 ~ 15
    gprs: Int32Array = new Int32Array(16)
    execMode: OpExecMode = OpExecMode.ARM
    instructionWidth: number = 0
    mode: ARMMode = ARMMode.System

    cpsrI: number = 0
    cpsrF: number = 0
    cpsrV: number = 0
    cpsrC: number = 0
    cpsrZ: number = 0
    cpsrN: number = 0

    spsr: number = 0

    bankedRegisters: Int32Array[] = []
    cycles: number = 0
    shifterOperand: number = 0
    shifterCarryOut: number = 0
    pageId: number = 0
    pageRegion: number = 0
    bankedSPSRs: Int32Array = new Int32Array();
    instruction: IOp | null = null
    armCompiler: ICompilerArm
    thumbCompiler: ICompilerThumb
    conditionPassed: boolean = false

    MODE_USER = 0x10;
    MODE_FIQ = 0x11;
    MODE_IRQ = 0x12;
    MODE_SUPERVISOR = 0x13;
    MODE_ABORT = 0x17;
    MODE_UNDEFINED = 0x1B;
    MODE_SYSTEM = 0x1F;
    core: IContext
    constructor(ctx: IContext) {
        this.core = ctx;
        this.armCompiler = new ARMCoreArm(this);
        this.thumbCompiler = new ARMCoreThumb(this);
        this.generateConds();
    }

    /**
     * 
     * @param startOffset 
     */
    resetCPU(startOffset: number): void {
        for (var i = 0; i < this.PC; ++i) {
            this.gprs[i] = 0;
        }
        this.gprs[this.PC] = startOffset + ARMCore.WORD_SIZE_ARM;

        this.loadInstruction = this.loadInstructionArm;
        this.execMode = OpExecMode.ARM;
        this.instructionWidth = ARMCore.WORD_SIZE_ARM;

        this.mode = ARMMode.System;

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
        this.getIRQ().getClear().clear();
    }

    /**
     * 執行指令
     */
    step(): void {
        const gprs = this.gprs;
        const mmu = this.getMMU();

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
        } else {
            if (this.conditionPassed) {
                const pc = gprs[this.PC] &= 0xFFFFFFFE;
                if (this.execMode == OpExecMode.ARM) {
                    mmu.wait32(pc);
                    mmu.waitPrefetch32(pc);
                } else {
                    mmu.wait(pc);
                    mmu.waitPrefetch(pc);
                }
                gprs[this.PC] += this.instructionWidth;
                if (!instruction.fixedJump) {
                    this.instruction = null;
                } else if (this.instruction != null) {
                    if (instruction.next == null || instruction.next.page?.invalid) {
                        instruction.next = this.loadInstruction(gprs[this.PC] - this.instructionWidth);
                    }
                    this.instruction = instruction.next;
                }
            } else {
                this.instruction = null;
            }
        }
        this.getIRQ().updateTimers();
    }

    freeze(): ICloseData {
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

    defrost(frost: ICloseData): void {
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

    fetchPage(address: number): void {
        const mmu = this.getMMU();
        const region = address >> mmu.BASE_OFFSET;
        const pageId = mmu.addressToPage(region, address & mmu.OFFSET_MASK);
        if (region == this.pageRegion) {
            if (pageId == this.pageId && !this.page?.invalid) {
                return;
            }
            this.pageId = pageId;
        } else {
            this.pageMask = (mmu.memory[region] as IBIOS).PAGE_MASK;
            this.pageRegion = region;
            this.pageId = pageId;
        }

        this.page = mmu.accessPage(region, pageId);
    }

    /**
     * 
     * @param address 
     */
    loadInstructionArm(address: number): IOp {

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

        const instruction = this.getMMU().load32(address) >>> 0;
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
    loadInstructionThumb(address: number) {
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
        const instruction = this.getMMU().load16(address);
        next = this.compileThumb(instruction);
        next.next = null;
        next.page = this.page;
        next.address = address;
        next.opcode = instruction;
        this.page.thumb[offset] = next;
        return next;
    }

    private getMMU():IGBAMMU{
        return this.core.getMMU() as IGBAMMU;
    }
    /**
     * 
     * @param mode 
     */
    selectBank(mode: ARMMode): ARMBank {
        switch (mode) {
            case ARMMode.User:
            case ARMMode.System:
                // No banked registers
                return ARMBank.NONE;
            case ARMMode.FIQ:
                return ARMBank.FIQ;
            case ARMMode.IRQ:
                return ARMBank.IRQ;
            case ARMMode.SVC:
                return ARMBank.SUPERVISOR;
            case ARMMode.ABT:
                return ARMBank.ABORT;
            case ARMMode.Undef:
                return ARMBank.UNDEFINED;
            default:
                throw new Error("Invalid user mode passed to selectBank");
        }
    }

    /**
     * 切換指令集
     * @param newMode 
     */
    switchExecMode(newMode: OpExecMode): void {
        if (this.execMode != newMode) {
            this.execMode = newMode;
            if (newMode == OpExecMode.ARM) {
                this.instructionWidth = ARMCore.WORD_SIZE_ARM;
                this.loadInstruction = this.loadInstructionArm;
            } else {
                this.instructionWidth = ARMCore.WORD_SIZE_THUMB;
                this.loadInstruction = this.loadInstructionThumb;
            }
        }

    }

    /**
     * 切換模式
     * @param newMode 
     */
    switchMode(newMode: ARMMode): void {
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

        if (newMode == ARMMode.FIQ || currentMode == ARMMode.FIQ) {
            const oldFiqBank: number = (oldBank == ARMBank.FIQ) ? 1 : 0;
            const newFiqBank: number = (newBank == ARMBank.FIQ) ? 1 : 0;
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
    packCPSR(): number {
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
    unpackCPSR(spsr: number): void {
        this.switchMode(spsr & 0x0000001F);
        this.switchExecMode(!!(spsr & 0x00000020) ? 1 : 0);
        this.cpsrF = spsr & 0x00000040;
        this.cpsrI = spsr & 0x00000080;
        this.cpsrN = spsr & 0x80000000;
        this.cpsrZ = spsr & 0x40000000;
        this.cpsrC = spsr & 0x20000000;
        this.cpsrV = spsr & 0x10000000;

        this.getIRQ().testIRQ();
    }

    private getIRQ(): IIRQ {
        return this.core.getIRQ() as IIRQ;
    }

    /**
     * 是否支援 SPSR
     */
    hasSPSR(): boolean {
        return this.mode != ARMMode.System && this.mode != ARMMode.User;
    }

    /**
     * 
     */
    raiseIRQ(): void {
        if (this.cpsrI) {
            return;
        }

        const cpsr = this.packCPSR();
        const instructionWidth = this.instructionWidth;
        this.switchMode(ARMMode.IRQ);
        this.spsr = cpsr;
        this.gprs[this.LR] = this.gprs[this.PC] - instructionWidth + 4;
        this.gprs[this.PC] = BaseAddress.IRQ + ARMCore.WORD_SIZE_ARM;
        this.instruction = null;
        this.switchExecMode(OpExecMode.ARM);
        this.cpsrI = true ? 1 : 0;
    }

    /**
     * 
     */
    raiseTrap(): void {
        const cpsr = this.packCPSR();
        const instructionWidth = this.instructionWidth;
        this.switchMode(ARMMode.SVC);
        this.spsr = cpsr;
        this.gprs[this.LR] = this.gprs[this.PC] - instructionWidth;
        this.gprs[this.PC] = BaseAddress.SWI + ARMCore.WORD_SIZE_ARM;
        this.instruction = null;
        this.switchExecMode(OpExecMode.ARM);
        this.cpsrI = true ? 1 : 0;
    }

    /**
     * 
     * @param instruction 
     */
    badOp(instruction: number): IOp {
        const func = function () {
            throw "Illegal instruction: 0x" + instruction.toString(16);
        };

        return {
            instruction: func,
            writesPC: true,
            fixedJump: false
        };
    }

    private generateConds(): void {
        const cpu: ARMCore = this;
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
        ]
    }

    /**
     * 
     * @param shiftType 
     * @param immediate 
     * @param rm 
     */
    barrelShiftImmediate(shiftType: number, immediate: number, rm: number): ICPUOperator {
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
                } else {
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
                } else {
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
                } else {
                    return function () {
                        cpu.shifterCarryOut = gprs[rm] & 0x80000000;
                        if (cpu.shifterCarryOut) {
                            cpu.shifterOperand = 0xFFFFFFFF;
                        } else {
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
                } else {
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

    private armBX(instruction: number, condOp: IConditionOperator): IOp {
        const rm = instruction & 0xF;
        const ins = this.armCompiler.constructBX(rm, condOp);
        return {
            instruction: ins,
            writesPC: true,
            fixedJump: false
        };
    }

    private armMRS(instruction: number, r: boolean, condOp: IConditionOperator): IOp {
        const rd = (instruction & 0x0000F000) >> 12;
        const ins = this.armCompiler.constructMRS(rd, r, condOp);

        return {
            instruction: ins,
            writesPC: (rd == this.PC)
        };
    }

    private armMSR(r: boolean, instruction: number, condOp: IConditionOperator): IOp {
        const rm = instruction & 0x0000000F;
        const rotateImm = (instruction & 0x00000F00) >> 7;
        let immediate = instruction & 0x000000FF;
        immediate = (immediate >>> rotateImm) | (immediate << (32 - rotateImm));
        const ins = this.armCompiler.constructMSR(rm, r, instruction, immediate, condOp);

        return {
            instruction: ins,
            writesPC: false
        }
    }

    private badInstruction(): IInstruction {
        return function () {
            throw new Error("bad Instruction");
        };
    }

    private opcodeToArmOp(opcode: number, s: boolean, rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IOp {
        let op: IInstruction = this.badInstruction();
        switch (opcode) {
            case 0x00000000:
                // AND
                if (s) {
                    op = this.armCompiler.constructANDS(rd, rn, shiftOp, condOp);
                } else {
                    op = this.armCompiler.constructAND(rd, rn, shiftOp, condOp);
                }
                break;
            case 0x00200000:
                // EOR
                if (s) {
                    op = this.armCompiler.constructEORS(rd, rn, shiftOp, condOp);
                } else {
                    op = this.armCompiler.constructEOR(rd, rn, shiftOp, condOp);
                }
                break;
            case 0x00400000:
                // SUB
                if (s) {
                    op = this.armCompiler.constructSUBS(rd, rn, shiftOp, condOp);
                } else {
                    op = this.armCompiler.constructSUB(rd, rn, shiftOp, condOp);
                }
                break;
            case 0x00600000:
                // RSB
                if (s) {
                    op = this.armCompiler.constructRSBS(rd, rn, shiftOp, condOp);
                } else {
                    op = this.armCompiler.constructRSB(rd, rn, shiftOp, condOp);
                }
                break;
            case 0x00800000:
                // ADD
                if (s) {
                    op = this.armCompiler.constructADDS(rd, rn, shiftOp, condOp);
                } else {
                    op = this.armCompiler.constructADD(rd, rn, shiftOp, condOp);
                }
                break;
            case 0x00A00000:
                // ADC
                if (s) {
                    op = this.armCompiler.constructADCS(rd, rn, shiftOp, condOp);
                } else {
                    op = this.armCompiler.constructADC(rd, rn, shiftOp, condOp);
                }
                break;
            case 0x00C00000:
                // SBC
                if (s) {
                    op = this.armCompiler.constructSBCS(rd, rn, shiftOp, condOp);
                } else {
                    op = this.armCompiler.constructSBC(rd, rn, shiftOp, condOp);
                }
                break;
            case 0x00E00000:
                // RSC
                if (s) {
                    op = this.armCompiler.constructRSCS(rd, rn, shiftOp, condOp);
                } else {
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
                } else {
                    op = this.armCompiler.constructORR(rd, rn, shiftOp, condOp);
                }
                break;
            case 0x01A00000:
                // MOV
                if (s) {
                    op = this.armCompiler.constructMOVS(rd, rn, shiftOp, condOp);
                } else {
                    op = this.armCompiler.constructMOV(rd, rn, shiftOp, condOp);
                }
                break;
            case 0x01C00000:
                // BIC
                if (s) {
                    op = this.armCompiler.constructBICS(rd, rn, shiftOp, condOp);
                } else {
                    op = this.armCompiler.constructBIC(rd, rn, shiftOp, condOp);
                }
                break;
            case 0x01E00000:
                // MVN
                if (s) {
                    op = this.armCompiler.constructMVNS(rd, rn, shiftOp, condOp);
                } else {
                    op = this.armCompiler.constructMVN(rd, rn, shiftOp, condOp);
                }
                break;
        }
        return {
            instruction: op,
            writesPC: (rd == this.PC)
        }
    }

    private shiftTypeToShiftOp(instruction: number, shiftType: number, rm: number): IInstruction {
        const rs = (instruction & 0x00000F00) >> 8;
        let shiftOp: IInstruction = this.badInstruction();
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
    private badAddress(instruction: number): ICPUAddress {
        const badAddress: any = function () {
            throw "Unimplemented memory access: 0x" + instruction.toString(16);
        };
        badAddress.writesPC = false;
        return badAddress;
    }

    private armLDRSTR(instruction: number, condOp: IConditionOperator): IOp {
        const rd = (instruction & 0x0000F000) >> 12;
        let load2 = instruction & 0x00100000;
        const b = instruction & 0x00400000;
        const i = instruction & 0x02000000;

        let address2: ICPUAddress = this.badAddress(instruction);
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
            } else {
                address2 = this.armCompiler.constructAddressingMode23Register(instruction, rm, condOp);
            }
        } else {
            // Immediate
            const offset = instruction & 0x00000FFF;
            address2 = this.armCompiler.constructAddressingMode23Immediate(instruction, offset, condOp);
        }
        let ins = this.badInstruction();
        if (load2) {
            if (b) {
                // LDRB
                ins = this.armCompiler.constructLDRB(rd, address2, condOp);
            } else {
                // LDR
                ins = this.armCompiler.constructLDR(rd, address2, condOp);
            }
        } else {
            if (b) {
                // STRB
                ins = this.armCompiler.constructSTRB(rd, address2, condOp);
            } else {
                // STR
                ins = this.armCompiler.constructSTR(rd, address2, condOp);
            }
        }
        const writesPC = ((rd == this.PC) || address2.writesPC);
        return {
            instruction: ins,
            writesPC
        }
    }

    private defaultConditionOperator(): IConditionOperator {
        return function () {
            return true;
        };
    }

    private badShiftOperator(): ICPUOperator {
        return function () {
            throw 'BUG: invalid barrel shifter';
        };
    }

    private arm001(instruction: number, condOp: IConditionOperator): IOp {
        const opcode = instruction & 0x01E00000;
        const s = (instruction & 0x00100000) > 0;
        let shiftsRs = false;
        let op = this.badOp(instruction);
        if ((opcode & 0x01800000) == 0x01000000 && !s) {
            const r = (instruction & 0x00400000) > 0;
            if ((instruction & 0x00B0F000) == 0x0020F000) {
                op = this.armMSR(r, instruction, condOp);
            } else if ((instruction & 0x00BF0000) == 0x000F0000) {
                op = this.armMRS(instruction, r, condOp);
            }
        } else {
            // Data processing/FSR transfer
            const rn = (instruction & 0x000F0000) >> 16;
            const rd = (instruction & 0x0000F000) >> 12;

            // Parse shifter operand
            const shiftType = instruction & 0x00000060;
            const rm = instruction & 0x0000000F;
            let shiftOp: ICPUOperator = this.badShiftOperator();

            if (instruction & 0x02000000) {
                const immediate = instruction & 0x000000FF;
                const rotate = (instruction & 0x00000F00) >> 7;
                if (!rotate) {
                    shiftOp = this.armCompiler.constructAddressingMode1Immediate(immediate);
                } else {
                    shiftOp = this.armCompiler.constructAddressingMode1ImmediateRotate(immediate, rotate);
                }
            } else if (instruction & 0x00000010) {
                shiftsRs = true;
                shiftOp = this.shiftTypeToShiftOp(instruction, shiftType, rm);
            } else {
                const immediate = (instruction & 0x00000F80) >> 7;
                shiftOp = this.barrelShiftImmediate(shiftType, immediate, rm);
            }
            op = this.opcodeToArmOp(opcode, s, rd, rn, shiftOp, condOp);
        }
        return op;
    }

    private armSingleDataSwap(instruction: number, condOp: IConditionOperator): IOp {
        const rm = instruction & 0x0000000F;
        const rd = (instruction >> 12) & 0x0000000F;
        const rn = (instruction >> 16) & 0x0000000F;
        let ins: IInstruction;
        if (instruction & 0x00400000) {
            ins = this.armCompiler.constructSWPB(rd, rn, rm, condOp);
        } else {
            ins = this.armCompiler.constructSWP(rd, rn, rm, condOp);
        }

        return {
            instruction: ins,
            writesPC: (rd == this.PC)
        };
    }


    private armMultiplies(instruction: number, condOp: IConditionOperator): IOp {
        // Multiplies
        const rd = (instruction & 0x000F0000) >> 16;
        const rn = (instruction & 0x0000F000) >> 12;
        const rs = (instruction & 0x00000F00) >> 8;
        const rm = instruction & 0x0000000F;
        const index = instruction & 0x00F00000;
        type CallFunc = (rd: number, rn: number, rs: number, rm: number, condOp: IConditionOperator) => IInstruction;
        const armCompiler = this.armCompiler;
        const func3Tofunc4 = function (handler: Function): CallFunc {
            return function (rd: number, rn: number, rs: number, rm: number, condOp: IConditionOperator): IInstruction {
                return handler.call(armCompiler, rd, rs, rm, condOp);
            }
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
        } as NumberHashtable<CallFunc>;

        if (index in func) {
            return {
                instruction: func[index].call(this.armCompiler, rd, rn, rs, rm, condOp),
                writesPC: (rd == this.PC)
            }
        } else {
            return this.badOp(instruction);
        }
    }

    private Instruction2Op(ins: IInstruction): IOp {
        return {
            instruction: ins,
            writesPC: false
        };
    }

    private armDataTransfer(instruction: number, condOp: IConditionOperator): IOp {
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
        } else {
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
                    } else {
                        // LDRH
                        op = this.Instruction2Op(this.armCompiler.constructLDRH(rd, address, condOp));
                    }
                } else {
                    if (s) {
                        // LDRSB
                        op = this.Instruction2Op(this.armCompiler.constructLDRSB(rd, address, condOp));
                    }
                }
            } else if (!s && h) {
                // STRH
                op = this.Instruction2Op(this.armCompiler.constructSTRH(rd, address, condOp));
            }
        }
        op.writesPC = ((rd == this.PC) || address.writesPC);
        return op;
    }


    private armBlockTransfer(instruction: number, condOp: IConditionOperator): IOp {
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
        } else {
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
        } else {
            address = this.armCompiler.constructAddressingMode4(immediate, rn);
        }

        if (load) {
            // LDM
            let ins: IInstruction;
            if (user) {
                ins = this.armCompiler.constructLDMS(rs, address, condOp);
            } else {
                ins = this.armCompiler.constructLDM(rs, address, condOp);
            }
            return {
                instruction: ins,
                writesPC: !!(rs & (1 << 15))
            };
        } else {
            // STM
            let ins: IInstruction;
            if (user) {
                ins = this.armCompiler.constructSTMS(rs, address, condOp);
            } else {
                ins = this.armCompiler.constructSTM(rs, address, condOp);
            }
            return {
                instruction: ins,
                writesPC: !!(rs & (1 << 15))
            };
        }
    }


    private armBranch(instruction: number, condOp: IConditionOperator): IOp {

        // Branch
        let immediate2 = instruction & 0x00FFFFFF;
        if (immediate2 & 0x00800000) {
            immediate2 |= 0xFF000000;
        }
        immediate2 <<= 2;
        const link = instruction & 0x01000000;
        let ins2: IInstruction;
        if (link) {
            ins2 = this.armCompiler.constructBL(immediate2, condOp);
        } else {
            ins2 = this.armCompiler.constructB(immediate2, condOp);
        }
        return {
            instruction: ins2,
            writesPC: true,
            fixedJump: true
        }
    }

    /**
     * 產生 Arm 執行指令
     * @param instruction 
     */
    compileArm(instruction: number): IOp {
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
        } else if (!(instruction & 0x0C000000) && (i == 0x02000000 || (instruction & 0x00000090) != 0x00000090)) {
            op = this.arm001(instruction, condOp);
        } else if ((instruction & 0x0FB00FF0) == 0x01000090) {
            op = this.armSingleDataSwap(instruction, condOp);
        } else {
            switch (i) {
                case 0x00000000:
                    if ((instruction & 0x010000F0) == 0x00000090) {
                        op = this.armMultiplies(instruction, condOp);
                    } else {
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

        op.execMode = OpExecMode.ARM;
        op.fixedJump = op.fixedJump || false;
        return op;
    }

    private thumbDataProcessingRegister(instruction: number): IInstruction {
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

    compileThumb(instruction: number) {
        var op = this.badOp(instruction & 0xFFFF);
        const cpu = this;
        const gprs = this.gprs;
        if ((instruction & 0xFC00) == 0x4000) {
            // Data-processing register
            const ins = this.thumbDataProcessingRegister(instruction);
            op.instruction = ins;
            op.writesPC = false;
        } else if ((instruction & 0xFC00) == 0x4400) {
            // Special data processing / branch/exchange instruction set
            const rm = (instruction & 0x0078) >> 3;
            const rn = instruction & 0x0007;
            const h1 = instruction & 0x0080;
            const rd = rn | (h1 >> 4);
            let ins: IInstruction;
            switch (instruction & 0x0300) {
                case 0x0000:
                    // ADD(4)
                    ins = this.thumbCompiler.constructADD4(rd, rm)
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
        } else if ((instruction & 0xF800) == 0x1800) {
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
                    } else {
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
        } else if (!(instruction & 0xE000)) {
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
        } else if ((instruction & 0xE000) == 0x2000) {
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
        } else if ((instruction & 0xF800) == 0x4800) {
            // LDR(3)
            const rd = (instruction & 0x0700) >> 8;
            const immediate = (instruction & 0x00FF) << 2;
            op.instruction = this.thumbCompiler.constructLDR3(rd, immediate);
            op.writesPC = false;
        } else if ((instruction & 0xF000) == 0x5000) {
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
        } else if ((instruction & 0xE000) == 0x6000) {
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
                } else {
                    // LDR(1)
                    op.instruction = this.thumbCompiler.constructLDR1(rd, rn, immediate);
                }
            } else {
                if (b) {
                    // STRB(1)
                    op.instruction = this.thumbCompiler.constructSTRB1(rd, rn, immediate);
                } else {
                    // STR(1)
                    op.instruction = this.thumbCompiler.constructSTR1(rd, rn, immediate);
                }
            }
            op.writesPC = false;
        } else if ((instruction & 0xF600) == 0xB400) {
            // Push and pop registers
            const r = !!(instruction & 0x0100);
            const rs = instruction & 0x00FF;
            if (instruction & 0x0800) {
                // POP
                op.instruction = this.thumbCompiler.constructPOP(rs, r);
                op.writesPC = r;
                op.fixedJump = false;
            } else {
                // PUSH
                op.instruction = this.thumbCompiler.constructPUSH(rs, r);
                op.writesPC = false;
            }
        } else if (instruction & 0x8000) {
            switch (instruction & 0x7000) {
                case 0x0000:
                    // Load and store halfword
                    const rd = instruction & 0x0007;
                    const rn = (instruction & 0x0038) >> 3;
                    const immediate = (instruction & 0x07C0) >> 5;
                    if (instruction & 0x0800) {
                        // LDRH(1)
                        op.instruction = this.thumbCompiler.constructLDRH1(rd, rn, immediate);
                    } else {
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
                    } else {
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
                    } else {
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
                        op.instruction = this.thumbCompiler.constructADD7(immediate4)
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
                    } else {
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
                    } else {
                        // B(1)
                        if (instruction & 0x0080) {
                            immediate6 |= 0xFFFFFF00;
                        }
                        immediate6 <<= 1;
                        let condOp = this.conds[cond];
                        if (!condOp) {
                            condOp = function (): boolean {
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
        } else {
            throw 'Bad opcode: 0x' + instruction.toString(16);
        }

        op.execMode = OpExecMode.THUMB;
        op.fixedJump = op.fixedJump || false;
        return op;
    }

    private WARN(message: string): void {
        console.error(message);
    }
}