export enum MemoryRegion {
    BIOS = 0x0,
    WORKING_RAM = 0x2,
    WORKING_IRAM = 0x3,
    IO = 0x4,
    PALETTE_RAM = 0x5,
    VRAM = 0x6,
    OAM = 0x7,
    CART0 = 0x8,
    CART1 = 0xA,
    CART2 = 0xC,
    CART_SRAM = 0xE
}

export enum MemoryRegionSize {
    BIOS = 0x00004000,
    WORKING_RAM = 0x00040000,
    WORKING_IRAM = 0x00008000,
    IO = 0x00000400,
    PALETTE_RAM = 0x00000400,
    VRAM = 0x00018000,
    OAM = 0x00000400,
    CART0 = 0x02000000,
    CART1 = 0x02000000,
    CART2 = 0x02000000,
    CART_SRAM = 0x00008000,
    CART_FLASH512 = 0x00010000,
    CART_FLASH1M = 0x00020000,
    CART_EEPROM = 0x00002000,
}

export interface IGPIO {
    store16(offset: number, value: number): void
    store32(offset: number, value: number): void

    outputPins(value: number): void

    core: IGBA | ILog
}

export interface IGBARTC {
    setPins(value: number): void
    setDirection(value: number): void
}

export interface IMMU {
    allocGPIO(romview: IMemoryView): IGPIO
    load8(offset: number): number
    load16(offset: number): number
    load32(offset: number): number

    loadU8(offset: number): number
    loadU16(offset: number): number
    store8(address: number, value: number): void
    store16(address: number, value: number): void
    store32(address: number, value: number): void
}

export interface ILinkLayer {
    startMultiplayerTransfer(): void
    setBaud(value: number): void
}

export interface IGBAMMU extends IMMU {
    waitPrefetch32(memory: number): void
    waitPrefetch(memory: number): void
    waitMul(value: number): void
    wait(value: number): void
    wait32(value: number): void
    waitSeq32(value: number): void
    waitMulti32(address: number, total: number): void

    accessPage(region: number, pageId: number): ICacheData
    addressToPage(region: number, address: number): number

    scheduleDma(number: DMANumber, info: IDMA): void 
    mmap(region: number, object: IMemoryView): void

    readonly OFFSET_MASK: number
    readonly BASE_OFFSET: number
    // readonly REGION_IO: number
    // readonly REGION_PALETTE_RAM: number
    // readonly REGION_VRAM: number
    // readonly REGION_OAM: number

    bios: IBIOS|IMemoryView
    badMemory: IMemoryView | null
    memory: Array<IMemoryView | IBIOS | IIO | null>
    cpu: ICPU
    save: ISave | IMemoryView | null
    cart: ICart | null

    loadBios(bios: ArrayBuffer, real: boolean): void
    loadRom(rom: ArrayBuffer, process: boolean): ICart | null
    loadSavedata(save: ArrayBuffer): void
}

export interface IFrost {
    cpu: ICloseData
    mmu: ICloseData
    irq: ICloseData
    io: ICloseData
    audio: ICloseData
    video: ICloseData
}

export interface ICacheData {
    invalid: boolean
    arm: NumberHashtable<IOp>
    thumb: NumberHashtable<IOp>
}

export interface IMemoryView {
    load8(offset: number): number
    load16(offset: number): number
    load32(offset: number): number

    loadU8(offset: number): number
    loadU16(offset: number): number

    store8(offset: number, value: number): void
    store16(offset: number, value: number): void
    store32(offset: number, value: number): void

    invalidatePage(address: number): void

    replaceData(memory: ArrayBuffer, offset: number): void

    buffer: ArrayBuffer
    icache: Array<ICacheData>
    view: DataView;
    mask: number;
}

export interface IGPRSMap {
    [index: number]: number
}

export enum ARMMode {
    User = 0x10,
    System = 0x1F,
    FIQ = 0x11,  // Fast Interrupt Request
    SVC = 0x13,  // Superviser Call
    ABT = 0x17,  // Abort
    IRQ = 0x12,  // Interrupt Request
    Undef = 0x1B // Undefine
}

export enum ARMBank {
    NONE = 0,
    FIQ = 1,
    IRQ = 2,
    SUPERVISOR = 3,
    ABORT = 4,
    UNDEFINED = 5
}

export interface IIO {
    registers: NumberHashtable<number>

    TM0CNT_LO: number
    TM1CNT_LO: number
    TM2CNT_LO: number
    TM3CNT_LO: number

    DMA0CNT_HI: number
    DMA1CNT_HI: number
    DMA2CNT_HI: number
    DMA3CNT_HI: number

    IME:number
    IF:number

    store16(offset: number, value: number): void
}

export interface IROMView {
    view: DataView
    mask: number
}

export type RegisterFlag = 0 | 1;

export interface IContext {
    io: IIO
}

export interface IRenderPath {
    writeDisplayControl(value: number): void
    writeBackgroundControl(bg: number, value: number): void
    writeBackgroundHOffset(bg: number, value: number): void
    writeBackgroundVOffset(bg: number, value: number): void

    writeBackgroundRefX(bg: number, value: number): void
    writeBackgroundRefY(bg: number, value: number): void

    writeBackgroundParamA(bg: number, value: number): void
    writeBackgroundParamB(bg: number, value: number): void
    writeBackgroundParamC(bg: number, value: number): void
    writeBackgroundParamD(bg: number, value: number): void

    writeBlendControl(value: number): void
    writeBlendAlpha(value: number): void
    writeBlendY(value: number): void
    writeMosaic(value: number): void

    writeWin0H(value: number): void
    writeWin1H(value: number): void

    writeWin0V(value: number): void
    writeWin1V(value: number): void

    writeWinIn(value: number): void
    writeWinOut(value: number): void

    clearSubsets(mmu: MemoryRegionSize, regions: number): void
}

export interface ICPU {
    gprs: IGPRSMap
    mmu: IGBAMMU
    irq: IIRQ | IClear
    instruction: IOp | null 
    instructionWidth: number
    readonly PC: number
    readonly LR: number
    readonly SP: number
    readonly USER_MASK: number
    readonly PRIV_MASK: number
    readonly STATE_MASK: number
    shifterCarryOut: number
    shifterOperand: number
    cycles: number

    // 狀態暫存器: SPSR (Saved Processor Status Register)
    // 在中斷時用來自動儲存CPSR的暫存器
    spsr: number

    // 狀態暫存器: CPSR (Current Processor Status Register) 
    // 32 Bits
    // https://developer.arm.com/docs/ddi0595/b/aarch32-system-registers/cpsr
    cpsrF: number // 6, fast interrupt
    cpsrI: number // 7, IRQ mask
    cpsrV: number // 28,Overflow
    cpsrC: number // 29,Carry
    cpsrZ: number // 30,Zero
    cpsrN: number // 31,Negative

    packCPSR(): number
    unpackCPSR(spsr: number): void
    hasSPSR(): boolean
    resetCPU(startOffset: number): void
    step(): void

    execMode: OpExecMode
    switchExecMode(mode: OpExecMode): void
    mode: ARMMode
    switchMode(mode: ARMMode): void

    raiseIRQ(): void
    raiseTrap(): void
}

export interface StringHashtable<T> {
    [index: string]: T
}

export interface NumberHashtable<T> {
    [index: number]: T
}


export interface IDMA {
    count: number
    enable: boolean
    dest: number
    repeat: boolean
    timing: number
    source: number
    nextIRQ: number
    doIrq: boolean
    drq: boolean
    width: number
    srcControl: number
    dstControl: number
    nextCount: number
    nextSource: number
    nextDest: number
}

export interface IClear {
    clear(): void
}

export interface IIRQ {
    testIRQ(): void
    swi32(value: number): void
    swi(value: number): void
    updateTimers(): void

    halt(): void

    dma: IDMA[]
    audio: IAudio|null
    video: IVideo|null
}

export type DMANumber = 0 | 1 | 2 | 3

export interface ISave {
    buffer: ArrayBuffer
    writePending: boolean
    view: DataView
    dma: IDMA | null
}

export interface ICart {
    title: string | null
    code: string | null
    maker: string | null
    memory: ArrayBuffer
    saveType: string | null
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
    (): void
}

export interface IOp {
    instruction: IInstruction
    writesPC: boolean
    fixedJump?: boolean
    execMode?: OpExecMode
    next?: null | IOp
    opcode?: number
    address?: number // 記憶體位址
    page?: ICacheData
}

export interface ICPUOperator {
    (): void
}

export interface IConditionOperator {
    (): boolean
}

export interface ICPUAddress2 {
    (value: boolean): number
}

export interface ICPUAddress {
    (): number
    writesPC: boolean
}

export interface ICompilerArm {
    constructAddressingMode23Immediate(instruction: number, immediate: number, condOp: IConditionOperator): ICPUAddress
    constructAddressingMode23Register(instruction: number, rm: number, condOp: IConditionOperator): ICPUAddress
    constructAddressingMode2RegisterShifted(instruction: number, shiftOp: ICPUOperator, condOp: IConditionOperator): ICPUAddress
    constructAddressingMode4Writeback(immediate: number, offset: number, rn: number, overlap: boolean): ICPUAddress2
    constructAddressingMode4(immediate: number, rn: number): ICPUAddress2

    constructAddressingMode1ASR(rs: number, rm: number): IInstruction
    constructAddressingMode1Immediate(immediate: number): IInstruction
    constructAddressingMode1ImmediateRotate(immediate: number, rotate: number): IInstruction
    constructAddressingMode1LSL(rs: number, rm: number): IInstruction
    constructAddressingMode1LSR(rs: number, rm: number): IInstruction
    constructAddressingMode1ROR(rs: number, rm: number): IInstruction
    constructADC(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator | null): IInstruction
    constructADCS(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructADD(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructADDS(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructAND(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructANDS(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructB(immediate: number, condOp: IConditionOperator): IInstruction
    constructBIC(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructBICS(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructBL(immediate: number, condOp: IConditionOperator): IInstruction
    constructBX(rm: number, condOp: IConditionOperator): IInstruction
    constructCMN(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructCMP(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructEOR(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructEORS(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructLDM(rs: number, address: ICPUAddress2, condOp: IConditionOperator): IInstruction
    constructLDMS(rs: number, address: ICPUAddress2, condOp: IConditionOperator): IInstruction
    constructLDR(rd: number, address: ICPUAddress, condOp: IConditionOperator): IInstruction
    constructLDRB(rd: number, address: ICPUAddress, condOp: IConditionOperator): IInstruction
    constructLDRH(rd: number, address: ICPUAddress, condOp: IConditionOperator): IInstruction
    constructLDRSB(rd: number, address: ICPUAddress, condOp: IConditionOperator): IInstruction
    constructLDRSH(rd: number, address: ICPUAddress, condOp: IConditionOperator): IInstruction
    constructMLA(rd: number, rn: number, rs: number, rm: number, condOp: IConditionOperator): IInstruction
    constructMLAS(rd: number, rn: number, rs: number, rm: number, condOp: IConditionOperator): IInstruction
    constructMOV(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructMOVS(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructMRS(rd: number, r: boolean, condOp: IConditionOperator): IInstruction
    constructMSR(rm: number, r: boolean, instruction: number, immediate: number, condOp: IConditionOperator): IInstruction
    constructMUL(rd: number, rs: number, rm: number, condOp: IConditionOperator): IInstruction
    constructMULS(rd: number, rs: number, rm: number, condOp: IConditionOperator): IInstruction
    constructMVN(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructMVNS(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructORR(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructORRS(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructRSB(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructRSBS(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructRSC(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructRSCS(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructSBC(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructSBCS(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructSMLAL(rd: number, rn: number, rs: number, rm: number, condOp: IConditionOperator): IInstruction
    constructSMLALS(rd: number, rn: number, rs: number, rm: number, condOp: IConditionOperator): IInstruction
    constructSMULL(rd: number, rn: number, rs: number, rm: number, condOp: IConditionOperator): IInstruction
    constructSMULLS(rd: number, rn: number, rs: number, rm: number, condOp: IConditionOperator): IInstruction
    constructSTM(rs: number, address: ICPUAddress2, condOp: IConditionOperator): IInstruction
    constructSTMS(rs: number, address: ICPUAddress2, condOp: IConditionOperator): IInstruction
    constructSTR(rd: number, address: ICPUAddress, condOp: IConditionOperator): IInstruction
    constructSTRB(rd: number, address: ICPUAddress, condOp: IConditionOperator): IInstruction
    constructSTRH(rd: number, address: ICPUAddress, condOp: IConditionOperator): IInstruction
    constructSUB(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructSUBS(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructSWI(immediate: number, condOp: IConditionOperator): IInstruction
    constructSWP(rd: number, rn: number, rm: number, condOp: IConditionOperator): IInstruction
    constructSWPB(rd: number, rn: number, rm: number, condOp: IConditionOperator): IInstruction
    constructTEQ(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructTST(rd: number, rn: number, shiftOp: ICPUOperator, condOp: IConditionOperator): IInstruction
    constructUMLAL(rd: number, rn: number, rs: number, rm: number, condOp: IConditionOperator): IInstruction
    constructUMLALS(rd: number, rn: number, rs: number, rm: number, condOp: IConditionOperator): IInstruction
    constructUMULL(rd: number, rn: number, rs: number, rm: number, condOp: IConditionOperator): IInstruction
    constructUMULLS(rd: number, rn: number, rs: number, rm: number, condOp: IConditionOperator): IInstruction
}

export interface ICompilerThumb {
    constructADC(rd: number, rm: number): IInstruction
    constructADD1(rd: number, rn: number, immediate: number): IInstruction
    constructADD2(rn: number, immediate: number): IInstruction
    constructADD3(rd: number, rn: number, rm: number): IInstruction
    constructADD4(rd: number, rm: number): IInstruction
    constructADD5(rd: number, immediate: number): IInstruction
    constructADD6(rd: number, immediate: number): IInstruction
    constructADD7(immediate: number): IInstruction
    constructAND(rd: number, rm: number): IInstruction
    constructASR1(rd: number, rm: number, immediate: number): IInstruction
    constructASR2(rd: number, rm: number): IInstruction
    constructB1(immediate: number, condOp: IConditionOperator): IInstruction
    constructB2(immediate: number): IInstruction
    constructBIC(rd: number, rm: number): IInstruction
    constructBL1(immediate: number): IInstruction
    constructBL2(immediate: number): IInstruction
    constructBX(rd: number, rm: number): IInstruction
    constructCMN(rd: number, rm: number): IInstruction
    constructCMP1(rn: number, immediate: number): IInstruction
    constructCMP2(rd: number, rm: number): IInstruction
    constructCMP3(rd: number, rm: number): IInstruction
    constructEOR(rd: number, rm: number): IInstruction
    constructLDMIA(rn: number, rs: number): IInstruction
    constructLDR1(rd: number, rn: number, immediate: number): IInstruction
    constructLDR2(rd: number, rn: number, rm: number): IInstruction
    constructLDR3(rd: number, immediate: number): IInstruction
    constructLDR4(rd: number, immediate: number): IInstruction
    constructLDRB1(rd: number, rn: number, immediate: number): IInstruction
    constructLDRB2(rd: number, rn: number, rm: number): IInstruction
    constructLDRH1(rd: number, rn: number, immediate: number): IInstruction
    constructLDRH2(rd: number, rn: number, rm: number): IInstruction
    constructLDRSB(rd: number, rn: number, rm: number): IInstruction
    constructLDRSH(rd: number, rn: number, rm: number): IInstruction
    constructLSL1(rd: number, rm: number, immediate: number): IInstruction
    constructLSL2(rd: number, rm: number): IInstruction
    constructLSR1(rd: number, rm: number, immediate: number): IInstruction
    constructLSR2(rd: number, rm: number): IInstruction
    constructMOV1(rn: number, immediate: number): IInstruction
    constructMOV2(rd: number, rn: number, rm: number): IInstruction
    constructMOV3(rd: number, rm: number): IInstruction
    constructMUL(rd: number, rm: number): IInstruction
    constructMVN(rd: number, rm: number): IInstruction
    constructNEG(rd: number, rm: number): IInstruction
    constructORR(rd: number, rm: number): IInstruction
    constructPOP(rs: number, r: boolean): IInstruction
    constructPUSH(rs: number, r: boolean): IInstruction
    constructROR(rd: number, rm: number): IInstruction
    constructSBC(rd: number, rm: number): IInstruction
    constructSTMIA(rn: number, rs: number): IInstruction
    constructSTR1(rd: number, rn: number, immediate: number): IInstruction
    constructSTR2(rd: number, rn: number, rm: number): IInstruction
    constructSTR3(rd: number, immediate: number): IInstruction
    constructSTRB1(rd: number, rn: number, immediate: number): IInstruction
    constructSTRB2(rd: number, rn: number, rm: number): IInstruction
    constructSTRH1(rd: number, rn: number, immediate: number): IInstruction
    constructSTRH2(rd: number, rn: number, rm: number): IInstruction
    constructSUB1(rd: number, rn: number, immediate: number): IInstruction
    constructSUB2(rn: number, immediate: number): IInstruction
    constructSUB3(rd: number, rn: number, rm: number): IInstruction
    constructSWI(immediate: number): IInstruction
    constructTST(rd: number, rm: number): IInstruction
}

export interface ILogger {
    (level: number, message: string): void
}

export interface ILog {
    setLogger(handler: ILogger): void

    ERROR(error: string): void
    WARN(warn: string): void
    STUB(func: string): void
    INFO(info: string): void
    DEBUG(info: string): void
}

export interface IAssert {
    ASSERT_UNREACHED(err: Error): never
    ASSERT(test: boolean, err: Error): void
}

export interface IKeypad {
    eatInput: boolean // 是否接受用戶輸入
}

export type DrawCallbackHandler = () => void;

export interface IVideo {
    drawCallback: DrawCallbackHandler
    updateTimers(cpu: ICPU): void
    writeDisplayStat(value: number): void

    DISPSTAT_MASK: number

    renderPath: IRenderPath
    hblankIRQ: number
    vblankIRQ: number
    vcounterIRQ: number
    nextEvent: number
}


export type ICloseData = StringHashtable<any>

export interface IClose {
    freeze(): ICloseData
    defrost(data: ICloseData): void
}

export interface IAudio {
    masterVolume: number
    context: unknown
    enableChannelA: boolean
    enableChannelB: boolean
    soundTimerA: boolean
    soundTimerB: boolean
    dmaA: number
    dmaB: number
    enabled: boolean
    nextEvent: number
    
    sampleFifoA(): void
    sampleFifoB(): void
    updateTimers(): void

    scheduleFIFODma(number: DMANumber, info: IDMA): void
}

export interface IGBA {
    setCanvas(canvas: unknown): void


    // TODO: 改為 get-property
    readonly keypad: IKeypad;
    readonly video: IVideo
    readonly context: unknown
    readonly targetCanvas: unknown
    readonly indirectCanvas: unknown
    readonly paused: boolean

    loadSavedataFromFile(file: unknown): void
    loadRomFromFile(file: unknown, callback: (result: boolean) => void): void

    setRom(rom: ArrayBuffer): boolean
    setBios(data: ArrayBuffer): void
    pause(): void
    reset(): void
    runStable(): void

    irq: IIRQ
    mmu: IGBAMMU | IClose | IClear
}

export enum LogLevel {
    Error
}

export enum IRQType {
	VBLANK = 0x0,
	HBLANK = 0x1,
	VCOUNTER = 0x2,
	TIMER0 = 0x3,
	TIMER1 = 0x4,
	TIMER2 = 0x5,
	TIMER3 = 0x6,
	SIO = 0x7,
	DMA0 = 0x8,
	DMA1 = 0x9,
	DMA2 = 0xA,
	DMA3 = 0xB,
	KEYPAD = 0xC,
	GAMEPAK = 0xD    
}

export enum IRQMask {
    VBLANK = 0x0001,
	HBLANK = 0x0002,
	VCOUNTER = 0x0004,
	TIMER0 = 0x0008,
	TIMER1 = 0x0010,
	TIMER2 = 0x0020,
	TIMER3 = 0x0040,
	SIO = 0x0080,
	DMA0 = 0x0100,
	DMA1 = 0x0200,
	DMA2 = 0x0400,
	DMA3 = 0x0800,
	KEYPAD = 0x1000,
    GAMEPAK = 0x2000
}