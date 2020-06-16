export interface IGPIO{
    store16(offset:number, value:number):void
    store32(offset:number, value:number):void
}

export interface IMMU {
    allocGPIO(romview: IMemoryView):IGPIO
    load8(offset:number):number
    load16(offset:number):number
    load32(offset:number):number

    loadU8(offset:number):number
    loadU16(offset:number):number
    store8(address: number, value: number):void
    store16(address: number, value: number):void
    store32(address: number, value: number):void
}

export interface IGBAMMU extends IMMU{
    waitPrefetch32(memory:number):void
    accessPage(region:number, pageId: number): number
    waitMul(value: number):void
    wait(value: number):void
    wait32(value: number):void
    waitMulti32(address: number, total: number):void
}

export interface IMemoryView {
    load8(offset:number):number
    load16(offset:number):number
    load32(offset:number):number

    loadU8(offset:number):number
    loadU16(offset:number):number

    store8(offset:number, value:number):void
    store16(offset:number, value:number):void
    store32(offset:number, value:number):void

    invalidatePage(address: number):void
    buffer: ArrayBuffer
    icache: Array<unknown>
}

export interface IGPRSMap {
    [index: number]:number
}

export interface ICPU {
    gprs: IGPRSMap
    mmu: IGBAMMU
    irq: IIRQ
    spsr: number

    instructionWidth: number
    execMode: number
    readonly PC:number
    readonly LR:number
    readonly MODE_ARM: number
    readonly MODE_SYSTEM: number
    readonly MODE_USER: number
    readonly USER_MASK: number
    readonly PRIV_MASK: number
    readonly STATE_MASK: number
    shifterCarryOut: number
    shifterOperand: number
    cycles: number    
    mode: number    
    

    cpsrI: number
    cpsrF: number
    cpsrN: number
    cpsrZ: number
    cpsrC: number
    cpsrV: number

    packCPSR(): number
    unpackCPSR(spsr:number): void
    hasSPSR(): boolean
    switchExecMode(mode: number): void
    switchMode(mode: number): void
}

export interface IPage {
    invalid: boolean
}

export interface IDMA {
    count: number
    enable: boolean
}

export interface IIRQ {
    clear():void
    testIRQ():void
    swi32(value: number):void
}

export interface ISave {
    writePending: boolean
    replaceData(memory:ArrayBuffer, offset:number):void
}

export interface ICart {
    title: string|null
    code: string|null
    maker: string|null
    memory: ArrayBuffer
    saveType: string|null
}

export interface IBIOS {
    ICACHE_PAGE_BITS: number
    PAGE_MASK: number
    real: boolean
}


export enum OpExecMode {
    ARM,
    THUMB
}

export interface IInstruction {
    ():void
}

export interface IOp extends IInstruction{
    writesPC: boolean
    fixedJump: boolean
    execMode: OpExecMode
}

export interface ICPUOperator {
    ():void
}

export interface IConditionOperator {
    ():boolean
}

export interface ICPUAddress2 {
    (value: boolean):number
}

export interface ICPUAddress {
    ():number
    writesPC: boolean
}

export interface ICompilerArm {
    // constructBX(rm: number, condOp: ICPUOperator): IInstruction
    
    // constructMSR(rm: number, r, instruction, immediate: number, condOp: ICPUOperator): IInstruction
    // constructMRS(rd: number, r, condOp: ICPUOperator):IInstruction

    constructAddressingMode1Immediate(immediate: number):IInstruction
    // constructAddressingMode1ImmediateRotate(immediate: number, rotate: number): IInstruction

    // constructSWPB(rd: number, rn: number, rm: number, condOp: ICPUOperator): IInstruction
    // constructSWP(rd: number, rn: number, rm: number, condOp: ICPUOperator): IInstruction
    // constructMUL(rd: number, rs: number, rm: number, condOp: ICPUOperator): IInstruction
    // constructMULS(rd: number, rs: number, rm: number, condOp: ICPUOperator): IInstruction
    // constructMLA(rd: number, rn: number, rs: number, rm: number, condOp: ICPUOperator): IInstruction
    // constructMLAS(rd: number, rn: number, rs: number, rm: number, condOp: ICPUOperator): IInstruction
    // constructUMULL(rd: number, rn: number, rs: number, rm: number, condOp: ICPUOperator): IInstruction
    // constructUMULLS(rd: number, rn: number, rs: number, rm: number, condOp: ICPUOperator): IInstruction
    // constructUMLAL(rd: number, rn: number, rs: number, rm: number, condOp: ICPUOperator): IInstruction
    // constructUMLALS(rd: number, rn: number, rs: number, rm: number, condOp: ICPUOperator): IInstruction
    // constructSMULL(rd: number, rn: number, rs: number, rm: number, condOp: ICPUOperator): IInstruction
    // constructSMULLS(rd: number, rn: number, rs: number, rm: number, condOp: ICPUOperator): IInstruction
    // constructSMLAL(rd: number, rn: number, rs: number, rm: number, condOp: ICPUOperator): IInstruction
    // constructSMLALS(rd: number, rn: number, rs: number, rm: number, condOp: ICPUOperator): IInstruction

    // constructAddressingMode23Immediate(instruction: number, immediate: number, condOp: ICPUOperator):IInstruction
    // constructAddressingMode23Register(instruction: number, rm: number, condOp: ICPUOperator):IInstruction
    // // constructAddressingMode2RegisterShifted(instruction: number, shiftOp:IInstruction, condOp: ICPUOperator):IInstruction

    // constructLDRSH(rd: number, address:IInstruction, condOp: ICPUOperator):IInstruction
    // constructLDRH(rd: number, address:IInstruction, condOp: ICPUOperator):IInstruction
    // constructLDRSB(rd: number, address:IInstruction, condOp: ICPUOperator):IInstruction
    // constructSTRH(rd: number, address:IInstruction, condOp: ICPUOperator):IInstruction
    // constructSTR(rd: number, address:IInstruction, condOp: ICPUOperator):IInstruction
    // constructSTRB(rd: number, address:IInstruction, condOp: ICPUOperator):IInstruction
    // constructLDR(rd: number, address:IInstruction, condOp: ICPUOperator):IInstruction
    // constructLDRB(rd: number, address:IInstruction, condOp: ICPUOperator):IInstruction

    // constructLDMS(rs: number, address:IInstruction, condOp: ICPUOperator):IInstruction
    // constructLDM(rs: number, address:IInstruction, condOp: ICPUOperator):IInstruction
    // constructSTMS(rs: number, address:IInstruction, condOp: ICPUOperator):IInstruction
    // constructSTM(rs: number, address:IInstruction, condOp: ICPUOperator):IInstruction

    constructAddressingMode4(immediate: number, rn: number):IInstruction
    // constructAddressingMode4Writeback(immediate: number, offset: number, rn: number, overlap: boolean): IInstruction

    // constructAddressingMode1LSL(rs: number, rm: number):IInstruction
    // constructAddressingMode1LSR(rs: number, rm: number):IInstruction
    // constructAddressingMode1ASR(rs: number, rm: number):IInstruction
    // constructAddressingMode1ROR(rs: number, rm: number):IInstruction

    // constructANDS(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator):IInstruction
    // constructAND(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator):IInstruction
    // constructEORS(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator):IInstruction
    // constructEOR(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator):IInstruction
    // constructSUBS(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator):IInstruction
    // constructSUB(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator):IInstruction
    // constructRSBS(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator):IInstruction
    // constructRSB(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator):IInstruction
    // constructADDS(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator):IInstruction
    // constructADD(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator):IInstruction
    // constructADCS(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator):IInstruction
    // constructADC(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator):IInstruction
    // constructSBCS(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator):IInstruction
    // constructSBC(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator):IInstruction
    // constructRSCS(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator):IInstruction
    // constructRSC(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator):IInstruction
    // constructTST(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator):IInstruction
    // constructTEQ(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator):IInstruction
    // constructCMP(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator):IInstruction
    // constructCMN(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator):IInstruction
    // constructORRS(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator):IInstruction
    // constructORR(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator):IInstruction
    // constructMOVS(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator):IInstruction
    // constructMOV(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator): IInstruction
    // constructBICS(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator): IInstruction
    // constructBIC(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator): IInstruction
    // constructMVNS(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator): IInstruction
    // constructMVN(rd: number, rn: number, shiftOp:IInstruction, condOp: ICPUOperator): IInstruction
}

export interface ICompilerThumb {

}