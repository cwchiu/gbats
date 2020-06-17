import {IGBAMMU, IIRQ, ICPU, IPage, ICompilerArm, ICompilerThumb, IOp, OpExecMode} from "../interfaces.ts";
import ARMCoreArm from "./ARMCoreArm.ts";
import ARMCoreThumb from "./ARMCoreThumb.ts";

/**
 * ARM 核心
 */
export default class ARMCore implements ICPU{
    SP:number = 13
	LR:number = 14
    PC:number = 15
    
    mmu: IGBAMMU 
    irq: IIRQ
    page: IPage | null = null
    conds: Array<unknown> = []

	MODE_USER:number = 0x10
	MODE_FIQ:number = 0x11
	MODE_IRQ:number = 0x12
	MODE_SUPERVISOR:number = 0x13
	MODE_ABORT:number = 0x17
	MODE_UNDEFINED:number = 0x1B
	MODE_SYSTEM:number = 0x1F

	BANK_NONE:number = 0
	BANK_FIQ:number = 1
	BANK_IRQ:number = 2
	BANK_SUPERVISOR:number = 3
	BANK_ABORT:number = 4
	BANK_UNDEFINED:number = 5

	UNALLOC_MASK:number = 0x0FFFFF00
	USER_MASK:number = 0xF0000000
	PRIV_MASK:number = 0x000000CF // This is out of spec, but it seems to be what's done in other implementations
	STATE_MASK:number = 0x00000020

	WORD_SIZE_ARM:number = 4
	WORD_SIZE_THUMB:number = 2

	BASE_RESET:number = 0x00000000
	BASE_UNDEF:number = 0x00000004
	BASE_SWI:number = 0x00000008
	BASE_PABT:number = 0x0000000C
	BASE_DABT:number = 0x00000010
	BASE_IRQ:number = 0x00000018
    BASE_FIQ:number = 0x0000001C
    gprs:Int32Array = new Int32Array(16)
    execMode:OpExecMode = OpExecMode.ARM
    instructionWidth: number = 0
    mode: number = 0
    cpsrI: number = 0
    cpsrF: number = 0
    cpsrV: number = 0
    cpsrC: number = 0
    cpsrZ: number = 0
    cpsrN: number = 0
    bankedRegisters: Int32Array[] = []
    spsr: number = 0
    cycles: number = 0
    shifterOperand: number = 0
    shifterCarryOut: number = 0
    pageId: number = 0
    pageRegion: number = 0
    bankedSPSRs: Int32Array = new Int32Array();
    instruction: null
    armCompiler: ICompilerArm
    thumbCompiler: ICompilerThumb
    conditionPassed: boolean = false

    constructor(){       
        this.armCompiler = new ARMCoreArm(this);
        this.thumbCompiler = new ARMCoreThumb(this);
        this.generateConds();
    }

    resetCPU(startOffset: number):void {
        for (var i = 0; i < this.PC; ++i) {
            this.gprs[i] = 0;
        }
        this.gprs[this.PC] = startOffset + this.WORD_SIZE_ARM;
    
        this.loadInstruction = this.loadInstructionArm;
        this.execMode = OpExecMode.ARM;
        this.instructionWidth = this.WORD_SIZE_ARM;
    
        this.mode = this.MODE_SYSTEM;
    
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
    
        var gprs = this.gprs;
        var mmu = this.mmu;

        this.step() {
            var instruction = this.instruction || (this.instruction = this.loadInstruction(gprs[this.PC] - this.instructionWidth));
            gprs[this.PC] += this.instructionWidth;
            this.conditionPassed = true;
            instruction();
    
            if (!instruction.writesPC) {
                if (this.instruction != null) { // We might have gotten an interrupt from the instruction
                    if (instruction.next == null || instruction.next.page.invalid) {
                        instruction.next = this.loadInstruction(gprs[this.PC] - this.instructionWidth);
                    }
                    this.instruction = instruction.next;
                }
            } else {
                if (this.conditionPassed) {
                    var pc = gprs[this.PC] &= 0xFFFFFFFE;
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
                    } else if  (this.instruction != null) {
                        if (instruction.next == null || instruction.next.page.invalid) {
                            instruction.next = this.loadInstruction(gprs[this.PC] - this.instructionWidth);
                        }
                        this.instruction = instruction.next;
                    }
                } else {
                    this.instruction = null;
                }
            }
            this.irq.updateTimers();
        };
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
    
    defrost(frost):void {
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
    
    fetchPage(address: number):void {
        var region = address >> this.mmu.BASE_OFFSET;
        var pageId = this.mmu.addressToPage(region, address & this.mmu.OFFSET_MASK);
        if (region == this.pageRegion) {
            if (pageId == this.pageId && !this.page.invalid) {
                return;
            }
            this.pageId = pageId;
        } else {
            this.pageMask = this.mmu.memory[region].PAGE_MASK;
            this.pageRegion = region;
            this.pageId = pageId;
        }
    
        this.page = this.mmu.accessPage(region, pageId);
    }
    
    loadInstructionArm(address: number) {
        var next = null;
        this.fetchPage(address);
        var offset = (address & this.pageMask) >> 2;
        next = this.page.arm[offset];
        if (next) {
            return next;
        }
        var instruction = this.mmu.load32(address) >>> 0;
        next = this.compileArm(instruction);
        next.next = null;
        next.page = this.page;
        next.address = address;
        next.opcode = instruction;
        this.page.arm[offset] = next;
        return next;
    }
    
    loadInstructionThumb(address: number) {
        var next = null;
        this.fetchPage(address);
        var offset = (address & this.pageMask) >> 1;
        next = this.page.thumb[offset];
        if (next) {
            return next;
        }
        var instruction = this.mmu.load16(address);
        next = this.compileThumb(instruction);
        next.next = null;
        next.page = this.page;
        next.address = address;
        next.opcode = instruction;
        this.page.thumb[offset] = next;
        return next;
    }
    
    selectBank(mode: number): number {
        switch (mode) {
        case this.MODE_USER:
        case this.MODE_SYSTEM:
            // No banked registers
            return this.BANK_NONE;
        case this.MODE_FIQ:
            return this.BANK_FIQ;
        case this.MODE_IRQ:
            return this.BANK_IRQ;
        case this.MODE_SUPERVISOR:
            return this.BANK_SUPERVISOR;
        case this.MODE_ABORT:
            return this.BANK_ABORT;
        case this.MODE_UNDEFINED:
            return this.BANK_UNDEFINED;
        default:
            throw "Invalid user mode passed to selectBank";
        }
    }
    
    switchExecMode(newMode: OpExecMode):void {
        if (this.execMode != newMode) {
            this.execMode = newMode;
            if (newMode == OpExecMode.ARM) {
                this.instructionWidth = this.WORD_SIZE_ARM;
                this.loadInstruction = this.loadInstructionArm;
            } else {
                this.instructionWidth = this.WORD_SIZE_THUMB;
                this.loadInstruction = this.loadInstructionThumb;
            }
        }
        
    }
    
    switchMode(newMode: number): void {
        if (newMode == this.mode) {
            // Not switching modes after all
            return;
        }
        if (newMode != this.MODE_USER || newMode != this.MODE_SYSTEM) {
            // Switch banked registers
            var newBank = this.selectBank(newMode);
            var oldBank = this.selectBank(this.mode);
            if (newBank != oldBank) {
                // TODO: support FIQ
                if (newMode == this.MODE_FIQ || this.mode == this.MODE_FIQ) {
                    var oldFiqBank = (oldBank == this.BANK_FIQ) + 0;
                    var newFiqBank = (newBank == this.BANK_FIQ) + 0;
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
        }
        this.mode = newMode;
    }
    
    packCPSR():number {
        return this.mode | (!!this.execMode << 5) | (!!this.cpsrF << 6) | (!!this.cpsrI << 7) |
               (!!this.cpsrN << 31) | (!!this.cpsrZ << 30) | (!!this.cpsrC << 29) | (!!this.cpsrV << 28);
    }
    
    /**
     * 
     * @param spsr 
     */
    unpackCPSR(spsr: number): void {
        this.switchMode(spsr & 0x0000001F);
        this.switchExecMode(!!(spsr & 0x00000020)?1:0);
        this.cpsrF = (spsr & 0x00000040) > 0;
        this.cpsrI = (spsr & 0x00000080) > 0;
        this.cpsrN = (spsr & 0x80000000) > 0;
        this.cpsrZ = (spsr & 0x40000000) > 0;
        this.cpsrC = (spsr & 0x20000000) > 0;
        this.cpsrV = (spsr & 0x10000000) > 0;
    
        this.irq.testIRQ();
    };
    
    /**
     * 
     */
    hasSPSR():boolean {
        return this.mode != this.MODE_SYSTEM && this.mode != this.MODE_USER;
    }
    
    /**
     * 
     */
    raiseIRQ():void {
        if (this.cpsrI) {
            return;
        }

        var cpsr = this.packCPSR();
        var instructionWidth = this.instructionWidth;
        this.switchMode(this.MODE_IRQ);
        this.spsr = cpsr;
        this.gprs[this.LR] = this.gprs[this.PC] - instructionWidth + 4;
        this.gprs[this.PC] = this.BASE_IRQ + this.WORD_SIZE_ARM;
        this.instruction = null;
        this.switchExecMode(this.MODE_ARM);
        this.cpsrI = true;
    }
    
    /**
     * 
     */
    raiseTrap():void {
        var cpsr = this.packCPSR();
        var instructionWidth = this.instructionWidth;
        this.switchMode(this.MODE_SUPERVISOR);
        this.spsr = cpsr;
        this.gprs[this.LR] = this.gprs[this.PC] - instructionWidth;
        this.gprs[this.PC] = this.BASE_SWI + this.WORD_SIZE_ARM;
        this.instruction = null;
        this.switchExecMode(this.MODE_ARM);
        this.cpsrI = true;
    }
    
    /**
     * 
     * @param instruction 
     */
    badOp(instruction: number): IOp {
        var func() {
            throw "Illegal instruction: 0x" + instruction.toString(16);
        };
        func.writesPC = true;
        func.fixedJump = false;
        return func;
    }
    
    private generateConds():void {
        const cpu: ARMCore = this;
        this.conds = [
            // EQ
            function() {
                return cpu.conditionPassed = cpu.cpsrZ;
            },
            // NE
            function() {
                return cpu.conditionPassed = !cpu.cpsrZ;
            },
            // CS
            function() {
                return cpu.conditionPassed = cpu.cpsrC;
            },
            // CC
            function() {
                return cpu.conditionPassed = !cpu.cpsrC;
            },
            // MI
            function() {
                return cpu.conditionPassed = cpu.cpsrN;
            },
            // PL
            function() {
                return cpu.conditionPassed = !cpu.cpsrN;
            },
            // VS
            function() {
                return cpu.conditionPassed = cpu.cpsrV;
            },
            // VC
            function() {
                return cpu.conditionPassed = !cpu.cpsrV;
            },
            // HI
            function () {
                return cpu.conditionPassed = cpu.cpsrC && !cpu.cpsrZ;
            },
            // LS
            function () {
                return cpu.conditionPassed = !cpu.cpsrC || cpu.cpsrZ;
            },
            // GE
            function () {
                return cpu.conditionPassed = !cpu.cpsrN == !cpu.cpsrV;
            },
            // LT
            function () {
                return cpu.conditionPassed = !cpu.cpsrN != !cpu.cpsrV;
            },
            // GT
            function () {
                return cpu.conditionPassed = !cpu.cpsrZ && !cpu.cpsrN == !cpu.cpsrV;
            },
            // LE
            function () {
                return cpu.conditionPassed = cpu.cpsrZ || !cpu.cpsrN != !cpu.cpsrV;
            },
            // AL
            null,
            null
        ]
    }
    
    barrelShiftImmediate(shiftType: number, immediate: number, rm: number) {
        var cpu = this;
        var gprs = this.gprs;
        var shiftOp = this.badOp;
        switch (shiftType) {
        case 0x00000000:
            // LSL
            if (immediate) {
                shiftOp() {
                    cpu.shifterOperand = gprs[rm] << immediate;
                    cpu.shifterCarryOut = gprs[rm] & (1 << (32 - immediate));
                };
            } else {
                // This boils down to no shift
                shiftOp() {
                    cpu.shifterOperand = gprs[rm];
                    cpu.shifterCarryOut = cpu.cpsrC;
                };
            }
            break;
        case 0x00000020:
            // LSR
            if (immediate) {
                shiftOp() {
                    cpu.shifterOperand = gprs[rm] >>> immediate;
                    cpu.shifterCarryOut = gprs[rm] & (1 << (immediate - 1));
                };
            } else {
                shiftOp() {
                    cpu.shifterOperand = 0;
                    cpu.shifterCarryOut = gprs[rm] & 0x80000000;
                };
            }
            break;
        case 0x00000040:
            // ASR
            if (immediate) {
                shiftOp() {
                    cpu.shifterOperand = gprs[rm] >> immediate;
                    cpu.shifterCarryOut = gprs[rm] & (1 << (immediate - 1));
                };
            } else {
                shiftOp() {
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
                shiftOp() {
                    cpu.shifterOperand = (gprs[rm] >>> immediate) | (gprs[rm] << (32 - immediate));
                    cpu.shifterCarryOut = gprs[rm] & (1 << (immediate - 1));
                };
            } else {
                // RRX
                shiftOp() {
                    cpu.shifterOperand = (!!cpu.cpsrC << 31) | (gprs[rm] >>> 1);
                    cpu.shifterCarryOut =  gprs[rm] & 0x00000001;
                };
            }
            break;
        }
        return shiftOp;
    }
    
    private armBX(instruction: number):IOp {
        const rm = instruction & 0xF;
        const op = this.armCompiler.constructBX(rm, condOp);
        op.writesPC = true;
        op.fixedJump = false;
        return op;
    }

    private armMRS(instruction: number, r: number, condOp: unknown): IOp{
        const rd = (instruction & 0x0000F000) >> 12;
                    const op = this.armCompiler.constructMRS(rd, r, condOp);
                    op.writesPC = (rd == this.PC);
                    return op;
    }

    private armMSR(instruction: number){
        const rm = instruction & 0x0000000F;
        const rotateImm = (instruction & 0x00000F00) >> 7;
        let immediate = instruction & 0x000000FF;
        immediate = (immediate >>> rotateImm) | (immediate << (32 - rotateImm));
        const op = this.armCompiler.constructMSR(rm, r, instruction, immediate, condOp);
        op.writesPC = false;
        return op

    }
    compileArm(instruction: number): IOp {
        let op = this.badOp(instruction);
        var i = instruction & 0x0E000000;
        const cpu = this;
        const gprs = this.gprs;
    
        const condOp = this.conds[(instruction & 0xF0000000) >>> 28];
        if ((instruction & 0x0FFFFFF0) == 0x012FFF10) {
            op = this.armBX(instruction);
        } else if (!(instruction & 0x0C000000) && (i == 0x02000000 || (instruction & 0x00000090) != 0x00000090)) {
            const opcode = instruction & 0x01E00000;
            const s = instruction & 0x00100000;
            let shiftsRs = false;
            if ((opcode & 0x01800000) == 0x01000000 && !s) {
                const r = instruction & 0x00400000;
                if ((instruction & 0x00B0F000) == 0x0020F000) {                    
                    op = this.armMSR(instruction);
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
                var shiftOp() {
                    throw 'BUG: invalid barrel shifter';
                };

                if (instruction & 0x02000000) {
                    const immediate = instruction & 0x000000FF;
                    const rotate = (instruction & 0x00000F00) >> 7;
                    if (!rotate) {
                        shiftOp = this.armCompiler.constructAddressingMode1Immediate(immediate);
                    } else {
                        shiftOp = this.armCompiler.constructAddressingMode1ImmediateRotate(immediate, rotate);
                    }
                } else if (instruction & 0x00000010) {
                    const rs = (instruction & 0x00000F00) >> 8;
                    shiftsRs = true;
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
                } else {
                    const immediate = (instruction & 0x00000F80) >> 7;
                    shiftOp = this.barrelShiftImmediate(shiftType, immediate, rm);
                }
    
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
                op.writesPC = rd == this.PC;
            }
        } else if ((instruction & 0x0FB00FF0) == 0x01000090) {
            // Single data swap
            const rm = instruction & 0x0000000F;
            const rd = (instruction >> 12) & 0x0000000F;
            const rn = (instruction >> 16) & 0x0000000F;
            if (instruction & 0x00400000) {
                op = this.armCompiler.constructSWPB(rd, rn, rm, condOp);
            } else {
                op = this.armCompiler.constructSWP(rd, rn, rm, condOp);
            }
            op.writesPC = (rd == this.PC);
        } else {
            switch (i) {
            case 0x00000000:
                if ((instruction & 0x010000F0) == 0x00000090) {
                    // Multiplies
                    const rd = (instruction & 0x000F0000) >> 16;
                    const rn = (instruction & 0x0000F000) >> 12;
                    const rs = (instruction & 0x00000F00) >> 8;
                    const rm = instruction & 0x0000000F;
                    switch (instruction & 0x00F00000) {
                    case 0x00000000:
                        // MUL
                        op = this.armCompiler.constructMUL(rd, rs, rm, condOp);
                        break;
                    case 0x00100000:
                        // MULS
                        op = this.armCompiler.constructMULS(rd, rs, rm, condOp);
                        break;
                    case 0x00200000:
                        // MLA
                        op = this.armCompiler.constructMLA(rd, rn, rs, rm, condOp);
                        break
                    case 0x00300000:
                        // MLAS
                        op = this.armCompiler.constructMLAS(rd, rn, rs, rm, condOp);
                        break;
                    case 0x00800000:
                        // UMULL
                        op = this.armCompiler.constructUMULL(rd, rn, rs, rm, condOp);
                        break;
                    case 0x00900000:
                        // UMULLS
                        op = this.armCompiler.constructUMULLS(rd, rn, rs, rm, condOp);
                        break;
                    case 0x00A00000:
                        // UMLAL
                        op = this.armCompiler.constructUMLAL(rd, rn, rs, rm, condOp);
                        break;
                    case 0x00B00000:
                        // UMLALS
                        op = this.armCompiler.constructUMLALS(rd, rn, rs, rm, condOp);
                        break;
                    case 0x00C00000:
                        // SMULL
                        op = this.armCompiler.constructSMULL(rd, rn, rs, rm, condOp);
                        break;
                    case 0x00D00000:
                        // SMULLS
                        op = this.armCompiler.constructSMULLS(rd, rn, rs, rm, condOp);
                        break;
                    case 0x00E00000:
                        // SMLAL
                        op = this.armCompiler.constructSMLAL(rd, rn, rs, rm, condOp);
                        break;
                    case 0x00F00000:
                        // SMLALS
                        op = this.armCompiler.constructSMLALS(rd, rn, rs, rm, condOp);
                        break;
                    }
                    op.writesPC = (rd == this.PC);
                } else {
                    // Halfword and signed byte data transfer
                    let load = instruction & 0x00100000;
                    const rd = (instruction & 0x0000F000) >> 12;
                    const hiOffset = (instruction & 0x00000F00) >> 4;
                    const loOffset = rm = instruction & 0x0000000F;
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
                    address.writesPC = !!w && (rn == this.PC);
    
                    if ((instruction & 0x00000090) == 0x00000090) {
                        if (load) {
                            // Load [signed] halfword/byte
                            if (h) {
                                if (s) {
                                    // LDRSH
                                    op = this.armCompiler.constructLDRSH(rd, address, condOp);
                                } else {
                                    // LDRH
                                    op = this.armCompiler.constructLDRH(rd, address, condOp);
                                }
                            } else {
                                if (s) {
                                    // LDRSB
                                    op = this.armCompiler.constructLDRSB(rd, address, condOp);
                                }
                            }
                        } else if (!s && h) {
                            // STRH
                            op = this.armCompiler.constructSTRH(rd, address, condOp);
                        }
                    }
                    op.writesPC = ((rd == this.PC) || address.writesPC);
                }
                break;
            case 0x04000000:
            case 0x06000000:
                // LDR/STR
                const rd = (instruction & 0x0000F000) >> 12;
                let load = instruction & 0x00100000;
                const b = instruction & 0x00400000;
                const i = instruction & 0x02000000;
    
                let address() {
                    throw "Unimplemented memory access: 0x" + instruction.toString(16);
                };
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
                        address = this.armCompiler.constructAddressingMode2RegisterShifted(instruction, shiftOp, condOp);
                    } else {
                        address = this.armCompiler.constructAddressingMode23Register(instruction, rm, condOp);
                    }
                } else {
                    // Immediate
                    const offset = instruction & 0x00000FFF;
                    address = this.armCompiler.constructAddressingMode23Immediate(instruction, offset, condOp);
                }
                if (load) {
                    if (b) {
                        // LDRB
                        op = this.armCompiler.constructLDRB(rd, address, condOp);
                    } else {
                        // LDR
                        op = this.armCompiler.constructLDR(rd, address, condOp);
                    }
                } else {
                    if (b) {
                        // STRB
                        op = this.armCompiler.constructSTRB(rd, address, condOp);
                    } else {
                        // STR
                        op = this.armCompiler.constructSTR(rd, address, condOp);
                    }
                }
                op.writesPC = ((rd == this.PC) || address.writesPC);
                break;
            case 0x08000000:
                // Block data transfer
                const load = instruction & 0x00100000;
                const w = instruction & 0x00200000;
                const user = instruction & 0x00400000;
                const u = instruction & 0x00800000;
                const p = instruction & 0x01000000;
                let rs = instruction & 0x0000FFFF;
                const rn = (instruction & 0x000F0000) >> 16;
    
                let address;
                let immediate = 0;
                let offset = 0;
                let overlap = false;
                if (u) {
                    if (p) {
                        immediate = 4;
                    }
                    for (var m = 0x01, i = 0; i < 16; m <<= 1, ++i) {
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
                    for (var m = 0x01, i = 0; i < 16; m <<= 1, ++i) {
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
                if (w) {
                    address = this.armCompiler.constructAddressingMode4Writeback(immediate, offset, rn, overlap);
                } else {
                    address = this.armCompiler.constructAddressingMode4(immediate, rn);
                }
                if (load) {
                    // LDM
                    if (user) {
                        op = this.armCompiler.constructLDMS(rs, address, condOp);
                    } else {
                        op = this.armCompiler.constructLDM(rs, address, condOp);
                    }
                    op.writesPC = !!(rs & (1 << 15));
                } else {
                    // STM
                    if (user) {
                        op = this.armCompiler.constructSTMS(rs, address, condOp);
                    } else {
                        op = this.armCompiler.constructSTM(rs, address, condOp);
                    }
                    op.writesPC = false;
                }
                break;
            case 0x0A000000:
                // Branch
                var immediate = instruction & 0x00FFFFFF;
                if (immediate & 0x00800000) {
                    immediate |= 0xFF000000;
                }
                immediate <<= 2;
                var link = instruction & 0x01000000;
                if (link) {
                    op = this.armCompiler.constructBL(immediate, condOp);
                } else {
                    op = this.armCompiler.constructB(immediate, condOp);
                }
                op.writesPC = true;
                op.fixedJump = true;
                break;
            case 0x0C000000:
                // Coprocessor data transfer
                break;
            case 0x0E000000:
                // Coprocessor data operation/SWI
                if ((instruction & 0x0F000000) == 0x0F000000) {
                    // SWI
                    const immediate = (instruction & 0x00FFFFFF);
                    op = this.armCompiler.constructSWI(immediate, condOp);
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
    
    compileThumb(instruction: number) {
        var op = this.badOp(instruction & 0xFFFF);
        var cpu = this;
        var gprs = this.gprs;
        if ((instruction & 0xFC00) == 0x4000) {
            // Data-processing register
            var rm = (instruction & 0x0038) >> 3;
            var rd = instruction & 0x0007;
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
            op.writesPC = false;
        } else if ((instruction & 0xFC00) == 0x4400) {
            // Special data processing / branch/exchange instruction set
            var rm = (instruction & 0x0078) >> 3;
            var rn = instruction & 0x0007;
            var h1 = instruction & 0x0080;
            var rd = rn | (h1 >> 4);
            switch (instruction & 0x0300) {
            case 0x0000:
                // ADD(4)
                op = this.thumbCompiler.constructADD4(rd, rm)
                op.writesPC = rd == this.PC;
                break;
            case 0x0100:
                // CMP(3)
                op = this.thumbCompiler.constructCMP3(rd, rm);
                op.writesPC = false;
                break;
            case 0x0200:
                // MOV(3)
                op = this.thumbCompiler.constructMOV3(rd, rm);
                op.writesPC = rd == this.PC;
                break;
            case 0x0300:
                // BX
                op = this.thumbCompiler.constructBX(rd, rm);
                op.writesPC = true;
                op.fixedJump = false;
                break;
            }
        } else if ((instruction & 0xF800) == 0x1800) {
            // Add/subtract
            var rm = (instruction & 0x01C0) >> 6;
            var rn = (instruction & 0x0038) >> 3;
            var rd = instruction & 0x0007;
            switch (instruction & 0x0600) {
            case 0x0000:
                // ADD(3)
                op = this.thumbCompiler.constructADD3(rd, rn, rm);
                break;
            case 0x0200:
                // SUB(3)
                op = this.thumbCompiler.constructSUB3(rd, rn, rm);
                break;
            case 0x0400:
                var immediate = (instruction & 0x01C0) >> 6;
                if (immediate) {
                    // ADD(1)
                    op = this.thumbCompiler.constructADD1(rd, rn, immediate);
                } else {
                    // MOV(2)
                    op = this.thumbCompiler.constructMOV2(rd, rn, rm);
                }
                break;
            case 0x0600:
                // SUB(1)
                var immediate = (instruction & 0x01C0) >> 6;
                op = this.thumbCompiler.constructSUB1(rd, rn, immediate);
                break;
            }
            op.writesPC = false;
        } else if (!(instruction & 0xE000)) {
            // Shift by immediate
            var rd = instruction & 0x0007;
            var rm = (instruction & 0x0038) >> 3;
            var immediate = (instruction & 0x07C0) >> 6;
            switch (instruction & 0x1800) {
            case 0x0000:
                // LSL(1)
                op = this.thumbCompiler.constructLSL1(rd, rm, immediate);
                break;
            case 0x0800:
                // LSR(1)
                op = this.thumbCompiler.constructLSR1(rd, rm, immediate);
                break;
            case 0x1000:
                // ASR(1)
                op = this.thumbCompiler.constructASR1(rd, rm, immediate);
                break;
            case 0x1800:
                break;
            }
            op.writesPC = false;
        } else if ((instruction & 0xE000) == 0x2000) {
            // Add/subtract/compare/move immediate
            var immediate = instruction & 0x00FF;
            var rn = (instruction & 0x0700) >> 8;
            switch (instruction & 0x1800) {
            case 0x0000:
                // MOV(1)
                op = this.thumbCompiler.constructMOV1(rn, immediate);
                break;
            case 0x0800:
                // CMP(1)
                op = this.thumbCompiler.constructCMP1(rn, immediate);
                break;
            case 0x1000:
                // ADD(2)
                op = this.thumbCompiler.constructADD2(rn, immediate);
                break;
            case 0x1800:
                // SUB(2)
                op = this.thumbCompiler.constructSUB2(rn, immediate);
                break;
            }
            op.writesPC = false;
        } else if ((instruction & 0xF800) == 0x4800) {
            // LDR(3)
            var rd = (instruction & 0x0700) >> 8;
            var immediate = (instruction & 0x00FF) << 2;
            op = this.thumbCompiler.constructLDR3(rd, immediate);
            op.writesPC = false;
        } else if ((instruction & 0xF000) == 0x5000) {
            // Load and store with relative offset
            var rd = instruction & 0x0007;
            var rn = (instruction & 0x0038) >> 3;
            var rm = (instruction & 0x01C0) >> 6;
            var opcode = instruction & 0x0E00;
            switch (opcode) {
            case 0x0000:
                // STR(2)
                op = this.thumbCompiler.constructSTR2(rd, rn, rm);
                break;
            case 0x0200:
                // STRH(2)
                op = this.thumbCompiler.constructSTRH2(rd, rn, rm);
                break;
            case 0x0400:
                // STRB(2)
                op = this.thumbCompiler.constructSTRB2(rd, rn, rm);
                break;
            case 0x0600:
                // LDRSB
                op = this.thumbCompiler.constructLDRSB(rd, rn, rm);
                break;
            case 0x0800:
                // LDR(2)
                op = this.thumbCompiler.constructLDR2(rd, rn, rm);
                break;
            case 0x0A00:
                // LDRH(2)
                op = this.thumbCompiler.constructLDRH2(rd, rn, rm);
                break;
            case 0x0C00:
                // LDRB(2)
                op = this.thumbCompiler.constructLDRB2(rd, rn, rm);
                break;
            case 0x0E00:
                // LDRSH
                op = this.thumbCompiler.constructLDRSH(rd, rn, rm);
                break;
            }
            op.writesPC = false;
        } else if ((instruction & 0xE000) == 0x6000) {
            // Load and store with immediate offset
            var rd = instruction & 0x0007;
            var rn = (instruction & 0x0038) >> 3;
            var immediate = (instruction & 0x07C0) >> 4;
            var b = instruction & 0x1000;
            if (b) {
                immediate >>= 2;
            }
            var load = instruction & 0x0800;
            if (load) {
                if (b) {
                    // LDRB(1)
                    op = this.thumbCompiler.constructLDRB1(rd, rn, immediate);
                } else {
                    // LDR(1)
                    op = this.thumbCompiler.constructLDR1(rd, rn, immediate);
                }
            } else {
                if (b) {
                    // STRB(1)
                    op = this.thumbCompiler.constructSTRB1(rd, rn, immediate);
                } else {
                    // STR(1)
                    op = this.thumbCompiler.constructSTR1(rd, rn, immediate);
                }
            }
            op.writesPC = false;
        } else if ((instruction & 0xF600) == 0xB400) {
            // Push and pop registers
            var r = !!(instruction & 0x0100);
            var rs = instruction & 0x00FF;
            if (instruction & 0x0800) {
                // POP
                op = this.thumbCompiler.constructPOP(rs, r);
                op.writesPC = r;
                op.fixedJump = false;
            } else {
                // PUSH
                op = this.thumbCompiler.constructPUSH(rs, r);
                op.writesPC = false;
            }
        } else if (instruction & 0x8000) {
            switch (instruction & 0x7000) {
            case 0x0000:
                // Load and store halfword
                var rd = instruction & 0x0007;
                var rn = (instruction & 0x0038) >> 3;
                var immediate = (instruction & 0x07C0) >> 5;
                if (instruction & 0x0800) {
                    // LDRH(1)
                    op = this.thumbCompiler.constructLDRH1(rd, rn, immediate);
                } else {
                    // STRH(1)
                    op = this.thumbCompiler.constructSTRH1(rd, rn, immediate);
                }
                op.writesPC = false;
                break;
            case 0x1000:
                // SP-relative load and store
                var rd = (instruction & 0x0700) >> 8;
                var immediate = (instruction & 0x00FF) << 2;
                var load = instruction & 0x0800;
                if (load) {
                    // LDR(4)
                    op = this.thumbCompiler.constructLDR4(rd, immediate);
                } else {
                    // STR(3)
                    op = this.thumbCompiler.constructSTR3(rd, immediate);
                }
                op.writesPC = false;
                break;
            case 0x2000:
                // Load address
                var rd = (instruction & 0x0700) >> 8;
                var immediate = (instruction & 0x00FF) << 2;
                if (instruction & 0x0800) {
                    // ADD(6)
                    op = this.thumbCompiler.constructADD6(rd, immediate);
                } else {
                    // ADD(5)
                    op = this.thumbCompiler.constructADD5(rd, immediate);
                }
                op.writesPC = false;
                break;
            case 0x3000:
                // Miscellaneous
                if (!(instruction & 0x0F00)) {
                    // Adjust stack pointer
                    // ADD(7)/SUB(4)
                    var b = instruction & 0x0080;
                    var immediate = (instruction & 0x7F) << 2;
                    if (b) {
                        immediate = -immediate;
                    }
                    op = this.thumbCompiler.constructADD7(immediate)
                    op.writesPC = false;
                }
                break;
            case 0x4000:
                // Multiple load and store
                var rn = (instruction & 0x0700) >> 8;
                var rs = instruction & 0x00FF;
                if (instruction & 0x0800) {
                    // LDMIA
                    op = this.thumbCompiler.constructLDMIA(rn, rs);
                } else {
                    // STMIA
                    op = this.thumbCompiler.constructSTMIA(rn, rs);
                }
                op.writesPC = false;
                break;
            case 0x5000:
                // Conditional branch
                var cond = (instruction & 0x0F00) >> 8;
                var immediate = (instruction & 0x00FF);
                if (cond == 0xF) {
                    // SWI
                    op = this.thumbCompiler.constructSWI(immediate);
                    op.writesPC = false;
                } else {
                    // B(1)
                    if (instruction & 0x0080) {
                        immediate |= 0xFFFFFF00;
                    }
                    immediate <<= 1;
                    var condOp = this.conds[cond];
                    op = this.thumbCompiler.constructB1(immediate, condOp);
                    op.writesPC = true;
                    op.fixedJump = true;
                }
                break;
            case 0x6000:
            case 0x7000:
                // BL(X)
                var immediate = instruction & 0x07FF;
                var h = instruction & 0x1800;
                switch (h) {
                case 0x0000:
                    // B(2)
                    if (immediate & 0x0400) {
                        immediate |= 0xFFFFF800;
                    }
                    immediate <<= 1;
                    op = this.thumbCompiler.constructB2(immediate);
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
                    if (immediate & 0x0400) {
                        immediate |= 0xFFFFFC00;
                    }
                    immediate <<= 12;
                    op = this.thumbCompiler.constructBL1(immediate);
                    op.writesPC = false;
                    break;
                case 0x1800:
                    // BL(2)
                    op = this.thumbCompiler.constructBL2(immediate);
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
}