import { ISIO, IIO, IKeypad, MemoryRegionSize, IGBA, IVideo, IAudio, IMemoryView, IBIOS, ICacheData, IGBAMMU, ICPU, IClose, IROMView, ICloseData, IClear, IContext, IIRQ, ILog, IDMA, DMANumber, NumberHashtable, IRenderPath } from "../interfaces.ts";
import { Serializer } from "../utils.ts";

interface store16DelegateResult {
    goReturn: boolean
    handle: boolean
}

type store16Delegate = (offset: number, value: number) => store16DelegateResult

export default class GameBoyAdvanceIO implements IClose, IIO, IClear, IMemoryView {
    buffer: Uint16Array = new Uint16Array(0);
    icache: Array<ICacheData> = []
    view: DataView = new DataView(new ArrayBuffer(0))
    mask: number = 0

    registers: Uint16Array | null = null
    cpu: ICPU | null = null
    core: ILog | IGBA | IContext | null = null
    video: IVideo | null = null
    audio: IAudio | null = null;
    keypad: IKeypad | null = null
    sio: ISIO | null = null
    // Video
    DISPCNT = 0x000
    GREENSWP = 0x002
    DISPSTAT = 0x004
    VCOUNT = 0x006
    BG0CNT = 0x008
    BG1CNT = 0x00A
    BG2CNT = 0x00C
    BG3CNT = 0x00E
    BG0HOFS = 0x010
    BG0VOFS = 0x012
    BG1HOFS = 0x014
    BG1VOFS = 0x016
    BG2HOFS = 0x018
    BG2VOFS = 0x01A
    BG3HOFS = 0x01C
    BG3VOFS = 0x01E
    BG2PA = 0x020
    BG2PB = 0x022
    BG2PC = 0x024
    BG2PD = 0x026
    BG2X_LO = 0x028
    BG2X_HI = 0x02A
    BG2Y_LO = 0x02C
    BG2Y_HI = 0x02E
    BG3PA = 0x030
    BG3PB = 0x032
    BG3PC = 0x034
    BG3PD = 0x036
    BG3X_LO = 0x038
    BG3X_HI = 0x03A
    BG3Y_LO = 0x03C
    BG3Y_HI = 0x03E
    WIN0H = 0x040
    WIN1H = 0x042
    WIN0V = 0x044
    WIN1V = 0x046
    WININ = 0x048
    WINOUT = 0x04A
    MOSAIC = 0x04C
    BLDCNT = 0x050
    BLDALPHA = 0x052
    BLDY = 0x054


    // Sound
    SOUND1CNT_LO = 0x060;
    SOUND1CNT_HI = 0x062;
    SOUND1CNT_X = 0x064;
    SOUND2CNT_LO = 0x068;
    SOUND2CNT_HI = 0x06C;
    SOUND3CNT_LO = 0x070;
    SOUND3CNT_HI = 0x072;
    SOUND3CNT_X = 0x074;
    SOUND4CNT_LO = 0x078;
    SOUND4CNT_HI = 0x07C;
    SOUNDCNT_LO = 0x080;
    SOUNDCNT_HI = 0x082;
    SOUNDCNT_X = 0x084;
    SOUNDBIAS = 0x088;
    WAVE_RAM0_LO = 0x090;
    WAVE_RAM0_HI = 0x092;
    WAVE_RAM1_LO = 0x094;
    WAVE_RAM1_HI = 0x096;
    WAVE_RAM2_LO = 0x098;
    WAVE_RAM2_HI = 0x09A;
    WAVE_RAM3_LO = 0x09C;
    WAVE_RAM3_HI = 0x09E;
    FIFO_A_LO = 0x0A0;
    FIFO_A_HI = 0x0A2;
    FIFO_B_LO = 0x0A4;
    FIFO_B_HI = 0x0A6;

    // DMA
    DMA0SAD_LO = 0x0B0;
    DMA0SAD_HI = 0x0B2;
    DMA0DAD_LO = 0x0B4;
    DMA0DAD_HI = 0x0B6;
    DMA0CNT_LO = 0x0B8;
    DMA0CNT_HI = 0x0BA;
    DMA1SAD_LO = 0x0BC;
    DMA1SAD_HI = 0x0BE;
    DMA1DAD_LO = 0x0C0;
    DMA1DAD_HI = 0x0C2;
    DMA1CNT_LO = 0x0C4;
    DMA1CNT_HI = 0x0C6;
    DMA2SAD_LO = 0x0C8;
    DMA2SAD_HI = 0x0CA;
    DMA2DAD_LO = 0x0CC;
    DMA2DAD_HI = 0x0CE;
    DMA2CNT_LO = 0x0D0;
    DMA2CNT_HI = 0x0D2;
    DMA3SAD_LO = 0x0D4;
    DMA3SAD_HI = 0x0D6;
    DMA3DAD_LO = 0x0D8;
    DMA3DAD_HI = 0x0DA;
    DMA3CNT_LO = 0x0DC;
    DMA3CNT_HI = 0x0DE;

    // Timers
    TM0CNT_LO = 0x100;
    TM0CNT_HI = 0x102;
    TM1CNT_LO = 0x104;
    TM1CNT_HI = 0x106;
    TM2CNT_LO = 0x108;
    TM2CNT_HI = 0x10A;
    TM3CNT_LO = 0x10C;
    TM3CNT_HI = 0x10E;

    // SIO (note: some of these are repeated)
    SIODATA32_LO = 0x120;
    SIOMULTI0 = 0x120;
    SIODATA32_HI = 0x122;
    SIOMULTI1 = 0x122;
    SIOMULTI2 = 0x124;
    SIOMULTI3 = 0x126;
    SIOCNT = 0x128;
    SIOMLT_SEND = 0x12A;
    SIODATA8 = 0x12A;
    RCNT = 0x134;
    JOYCNT = 0x140;
    JOY_RECV = 0x150;
    JOY_TRANS = 0x154;
    JOYSTAT = 0x158;

    // Keypad
    KEYINPUT = 0x130;
    KEYCNT = 0x132;

    // Interrupts, etc
    IE = 0x200;
    IF = 0x202;
    WAITCNT = 0x204;
    IME = 0x208;

    POSTFLG = 0x300;
    HALTCNT = 0x301;

    DEFAULT_DISPCNT = 0x0080;
    DEFAULT_SOUNDBIAS = 0x200;
    DEFAULT_BGPA = 1;
    DEFAULT_BGPD = 1;
    DEFAULT_RCNT = 0x8000;

    constructor() {


    }


    /**
     * 
     */
    clear() {
        this.registers = new Uint16Array(MemoryRegionSize.IO);

        this.registers[this.DISPCNT >> 1] = this.DEFAULT_DISPCNT;
        this.registers[this.SOUNDBIAS >> 1] = this.DEFAULT_SOUNDBIAS;
        this.registers[this.BG2PA >> 1] = this.DEFAULT_BGPA;
        this.registers[this.BG2PD >> 1] = this.DEFAULT_BGPD;
        this.registers[this.BG3PA >> 1] = this.DEFAULT_BGPA;
        this.registers[this.BG3PD >> 1] = this.DEFAULT_BGPD;
        this.registers[this.RCNT >> 1] = this.DEFAULT_RCNT;
    }

    /**
     * 
     */
    freeze(): ICloseData {
        if (!this.registers) {
            throw new Error("register no init");
        }

        return {
            'registers': Serializer.prefix(this.registers.buffer)
        };
    }

    /**
     * 
     * @param frost 
     */
    defrost(frost: ICloseData): void {
        if (!this.registers) {
            throw new Error("register no init");
        }

        this.registers = new Uint16Array(frost.registers);
        // Video registers don't serialize themselves
        for (let i = 0; i <= this.BLDY; i += 2) {
            this.store16(this.registers[i >> 1], 0 /* bug? */);
        }
    }

    replaceData(memory: ArrayBuffer, offset: number): void {
        throw new Error("no imp");
    }

    getMemoryView(): IMemoryView {
        return this as IMemoryView;
    }

    /**
     * 
     * @param offset 
     */
    load8(offset: number): never {
        throw 'Unimplmeneted unaligned I/O access';
    }

    /**
     * 
     * @param offset 
     */
    load16(offset: number): number {
        return (this.loadU16(offset) << 16) >> 16;
    }

    /**
     * 
     * @param offset 
     */
    load32(offset: number): number {
        offset &= 0xFFFFFFFC;
        switch (offset) {
            case this.DMA0CNT_LO:
            case this.DMA1CNT_LO:
            case this.DMA2CNT_LO:
            case this.DMA3CNT_LO:
                return this.loadU16(offset | 2) << 16;
            case this.IME:
                return this.loadU16(offset) & 0xFFFF;
            case this.JOY_RECV:
            case this.JOY_TRANS:
                (this.core as ILog).STUB('Unimplemented JOY register read: 0x' + offset.toString(16));
                return 0;
        }

        return this.loadU16(offset) | (this.loadU16(offset | 2) << 16);
    }

    /**
     * 
     * @param offset 
     */
    loadU8(offset: number): number {
        const odd = offset & 0x0001;
        const value = this.loadU16(offset & 0xFFFE);
        return (value >>> (odd << 3)) & 0xFF;
    }

    private getGBA(): IGBA {
        return this.core as IGBA
    }

    private getGBAContext(): IContext {
        return this.core as IContext;
    }

    private getGBAMMU(): IGBAMMU {
        return this.getGBAContext().getMMU() as IGBAMMU;
    }

    private getGBAMMUView(): IMemoryView {
        const view = this.getGBAMMU().badMemory;
        if (!view) {
            throw new Error("view no init");
        }
        return view;
    }

    private getIRQ(): IIRQ {
        // return this.getCPU().irq as IIRQ;
        return this.getGBAContext().getIRQ() as IIRQ;
    }

    private getCPU(): ICPU {
        if (!this.cpu) {
            throw new Error("cpu no init")
        }
        return this.cpu;
    }

    private getKeypad(): IKeypad {
        if (!this.keypad) {
            throw new Error("keypad no init");
        }
        return this.keypad;
    }

    private getSIO(): ISIO {
        if (!this.sio) {
            throw new Error("sio no init");
        }

        return this.sio;
    }

    /**
     * 
     * @param offset 
     */
    loadU16(offset: number): number {
        if (!this.registers) {
            throw new Error("register no init");
        }
        const registerValue = this.registers[offset >> 1];
        if ([
            this.DISPCNT,
            this.BG0CNT,
            this.BG1CNT,
            this.BG2CNT,
            this.BG3CNT,
            this.WININ,
            this.WINOUT,
            this.SOUND1CNT_LO,
            this.SOUND3CNT_LO,
            this.SOUNDCNT_LO,
            this.SOUNDCNT_HI,
            this.SOUNDBIAS,
            this.BLDCNT,
            this.BLDALPHA,
            this.TM0CNT_HI,
            this.TM1CNT_HI,
            this.TM2CNT_HI,
            this.TM3CNT_HI,
            this.DMA0CNT_HI,
            this.DMA1CNT_HI,
            this.DMA2CNT_HI,
            this.DMA3CNT_HI,
            this.RCNT,
            this.WAITCNT,
            this.IE,
            this.IF,
            this.IME,
            this.POSTFLG,
        ].includes(offset)) {
            // Handled transparently by the written registers
            return registerValue;
        }


        if ([
            this.BG0HOFS,
            this.BG0VOFS,
            this.BG1HOFS,
            this.BG1VOFS,
            this.BG2HOFS,
            this.BG2VOFS,
            this.BG3HOFS,
            this.BG3VOFS,
            this.BG2PA,
            this.BG2PB,
            this.BG2PC,
            this.BG2PD,
            this.BG3PA,
            this.BG3PB,
            this.BG3PC,
            this.BG3PD,
            this.BG2X_LO,
            this.BG2X_HI,
            this.BG2Y_LO,
            this.BG2Y_HI,
            this.BG3X_LO,
            this.BG3X_HI,
            this.BG3Y_LO,
            this.BG3Y_HI,
            this.WIN0H,
            this.WIN1H,
            this.WIN0V,
            this.WIN1V,
            this.BLDY,
            this.DMA0SAD_LO,
            this.DMA0SAD_HI,
            this.DMA0DAD_LO,
            this.DMA0DAD_HI,
            this.DMA0CNT_LO,
            this.DMA1SAD_LO,
            this.DMA1SAD_HI,
            this.DMA1DAD_LO,
            this.DMA1DAD_HI,
            this.DMA1CNT_LO,
            this.DMA2SAD_LO,
            this.DMA2SAD_HI,
            this.DMA2DAD_LO,
            this.DMA2DAD_HI,
            this.DMA2CNT_LO,
            this.DMA3SAD_LO,
            this.DMA3SAD_HI,
            this.DMA3DAD_LO,
            this.DMA3DAD_HI,
            this.DMA3CNT_LO,
            this.FIFO_A_LO,
            this.FIFO_A_HI,
            this.FIFO_B_LO,
            this.FIFO_B_HI,
        ].includes(offset)) {
            (this.core as ILog).WARN('Read for write-only register: 0x' + offset.toString(16));
            return this.getGBAMMUView().loadU16(0);
        }

        const video = this.getVideo();
        const irq = this.getIRQ();
        const keypad = this.getKeypad();
        const sio = this.getSIO();
        const log = this.getLog();

        switch (offset) {
            // Video
            case this.DISPSTAT:
                return registerValue | video.readDisplayStat();
            case this.VCOUNT:
                return video.vcount;
            // Sound
            case this.SOUND1CNT_HI:
            case this.SOUND2CNT_LO:
                return registerValue & 0xFFC0;
            case this.SOUND1CNT_X:
            case this.SOUND2CNT_HI:
            case this.SOUND3CNT_X:
                return registerValue & 0x4000;
            case this.SOUND3CNT_HI:
                return registerValue & 0xE000;
            case this.SOUND4CNT_LO:
                return registerValue & 0xFF00;
            case this.SOUND4CNT_HI:
                return registerValue & 0x40FF;
            case this.SOUNDCNT_X:
                (this.core as ILog).STUB('Unimplemented sound register read: SOUNDCNT_X');
                return registerValue | 0x0000;

            // Timers
            case this.TM0CNT_LO:
                return irq.timerRead(0);
            case this.TM1CNT_LO:
                return irq.timerRead(1);
            case this.TM2CNT_LO:
                return irq.timerRead(2);
            case this.TM3CNT_LO:
                return irq.timerRead(3);

            // SIO
            case this.SIOCNT:
                return sio.readSIOCNT();
            case this.KEYINPUT:
                keypad.pollGamepads();
                return keypad.currentDown;
            case this.KEYCNT:
                (this.core as ILog).STUB('Unimplemented I/O register read: KEYCNT');
                return 0;
            case this.MOSAIC:
                (this.core as ILog).WARN('Read for write-only register: 0x' + offset.toString(16));
                return 0;

            case this.SIOMULTI0:
            case this.SIOMULTI1:
            case this.SIOMULTI2:
            case this.SIOMULTI3:
                return sio.read((offset - this.SIOMULTI0) >> 1);

            case this.SIODATA8:
                log.STUB('Unimplemented SIO register read: 0x' + offset.toString(16));
                return 0;
            case this.JOYCNT:
            case this.JOYSTAT:
                log.STUB('Unimplemented JOY register read: 0x' + offset.toString(16));
                return 0;

            default:
                log.WARN('Bad I/O register read: 0x' + offset.toString(16));
                return this.getGBAMMUView().loadU16(0);
        }
        // return this.registers[offset >> 1];
    }

    private getLog(): ILog {
        return this.core as ILog;
    }
    store8(offset: number, value: number): void {
        switch (offset) {
            // case this.WININ:
            //     this.value & 0x3F;
            //     break;
            // case this.WININ | 1:
            //     this.value & 0x3F;
            //     break;
            // case this.WINOUT:
            //     this.value & 0x3F;
            //     break;
            // case this.WINOUT | 1:
            //     this.value & 0x3F;
            //     break;
            case this.SOUND1CNT_LO:
            case this.SOUND1CNT_LO | 1:
            case this.SOUND1CNT_HI:
            case this.SOUND1CNT_HI | 1:
            case this.SOUND1CNT_X:
            case this.SOUND1CNT_X | 1:
            case this.SOUND2CNT_LO:
            case this.SOUND2CNT_LO | 1:
            case this.SOUND2CNT_HI:
            case this.SOUND2CNT_HI | 1:
            case this.SOUND3CNT_LO:
            case this.SOUND3CNT_LO | 1:
            case this.SOUND3CNT_HI:
            case this.SOUND3CNT_HI | 1:
            case this.SOUND3CNT_X:
            case this.SOUND3CNT_X | 1:
            case this.SOUND4CNT_LO:
            case this.SOUND4CNT_LO | 1:
            case this.SOUND4CNT_HI:
            case this.SOUND4CNT_HI | 1:
            case this.SOUNDCNT_LO:
            case this.SOUNDCNT_LO | 1:
            case this.SOUNDCNT_X:
            case this.IF:
            case this.IME:
                break;
            case this.SOUNDBIAS | 1:
                this.STUB_REG('sound', offset);
                break;
            case this.HALTCNT:
                value &= 0x80;
                if (!value) {
                    this.getIRQ().halt();
                } else {
                    (this.core as ILog).STUB('Stop');
                }
                return;
            default:
                this.STUB_REG('8-bit I/O', offset);
                break;
        }

        if (!this.registers) {
            throw new Error("register no init");
        }

        if (offset & 1) {
            value <<= 8;
            value |= (this.registers[offset >> 1] & 0x00FF);
        } else {
            value &= 0x00FF;
            value |= (this.registers[offset >> 1] & 0xFF00);
        }
        this.store16(offset & 0xFFFFFFE, value);
    }



    private getVideo(): IVideo {
        if (!this.video) {
            throw new Error('video no init');
        }
        return this.video;
    }
    private getVideoRender(): IRenderPath {
        return this.getVideo().renderPath as IRenderPath;
    }

    private handleVideo(offset: number, value: number): store16DelegateResult {

        if (!this.registers) {
            throw new Error("register no init");
        }

        const video = this.getVideo();
        const render = this.getVideoRender();
        switch (offset) {
            // Video
            case this.DISPCNT:
                render.writeDisplayControl(value);
                break;
            case this.DISPSTAT:
                value &= video.DISPSTAT_MASK;
                video.writeDisplayStat(value);
                break;
            case this.BG0CNT:
                render.writeBackgroundControl(0, value);
                break;
            case this.BG1CNT:
                render.writeBackgroundControl(1, value);
                break;
            case this.BG2CNT:
                render.writeBackgroundControl(2, value);
                break;
            case this.BG3CNT:
                render.writeBackgroundControl(3, value);
                break;
            case this.BG0HOFS:
                render.writeBackgroundHOffset(0, value);
                break;
            case this.BG0VOFS:
                render.writeBackgroundVOffset(0, value);
                break;
            case this.BG1HOFS:
                render.writeBackgroundHOffset(1, value);
                break;
            case this.BG1VOFS:
                render.writeBackgroundVOffset(1, value);
                break;
            case this.BG2HOFS:
                render.writeBackgroundHOffset(2, value);
                break;
            case this.BG2VOFS:
                render.writeBackgroundVOffset(2, value);
                break;
            case this.BG3HOFS:
                render.writeBackgroundHOffset(3, value);
                break;
            case this.BG3VOFS:
                render.writeBackgroundVOffset(3, value);
                break;
            case this.BG2X_LO:
                render.writeBackgroundRefX(2, (this.registers[(offset >> 1) | 1] << 16) | value);
                break;
            case this.BG2X_HI:
                render.writeBackgroundRefX(2, this.registers[(offset >> 1) ^ 1] | (value << 16));
                break;
            case this.BG2Y_LO:
                render.writeBackgroundRefY(2, (this.registers[(offset >> 1) | 1] << 16) | value);
                break;
            case this.BG2Y_HI:
                render.writeBackgroundRefY(2, this.registers[(offset >> 1) ^ 1] | (value << 16));
                break;
            case this.BG2PA:
                render.writeBackgroundParamA(2, value);
                break;
            case this.BG2PB:
                render.writeBackgroundParamB(2, value);
                break;
            case this.BG2PC:
                render.writeBackgroundParamC(2, value);
                break;
            case this.BG2PD:
                render.writeBackgroundParamD(2, value);
                break;
            case this.BG3X_LO:
                render.writeBackgroundRefX(3, (this.registers[(offset >> 1) | 1] << 16) | value);
                break;
            case this.BG3X_HI:
                render.writeBackgroundRefX(3, this.registers[(offset >> 1) ^ 1] | (value << 16));
                break;
            case this.BG3Y_LO:
                render.writeBackgroundRefY(3, (this.registers[(offset >> 1) | 1] << 16) | value);
                break;
            case this.BG3Y_HI:
                render.writeBackgroundRefY(3, this.registers[(offset >> 1) ^ 1] | (value << 16));
                break;
            case this.BG3PA:
                render.writeBackgroundParamA(3, value);
                break;
            case this.BG3PB:
                render.writeBackgroundParamB(3, value);
                break;
            case this.BG3PC:
                render.writeBackgroundParamC(3, value);
                break;
            case this.BG3PD:
                render.writeBackgroundParamD(3, value);
                break;
            case this.WIN0H:
                render.writeWin0H(value);
                break;
            case this.WIN1H:
                render.writeWin1H(value);
                break;
            case this.WIN0V:
                render.writeWin0V(value);
                break;
            case this.WIN1V:
                render.writeWin1V(value);
                break;
            case this.WININ:
                value &= 0x3F3F;
                render.writeWinIn(value);
                break;
            case this.WINOUT:
                value &= 0x3F3F;
                render.writeWinOut(value);
                break;
            case this.BLDCNT:
                value &= 0x7FFF;
                render.writeBlendControl(value);
                break;
            case this.BLDALPHA:
                value &= 0x1F1F;
                render.writeBlendAlpha(value);
                break;
            case this.BLDY:
                value &= 0x001F;
                render.writeBlendY(value);
                break;
            case this.MOSAIC:
                render.writeMosaic(value);
                break;
            default:
                return {
                    goReturn: false,
                    handle: false
                };
        }

        return {
            goReturn: false,
            handle: true
        };
    }

    private getAudio(): IAudio {
        if (!this.audio) {
            throw new Error("audio no init");
        }
        return this.audio;
    }

    private handleAudio(offset: number, value: number): store16DelegateResult {
        const audio = this.getAudio();
        switch (offset) {

            // Sound
            case this.SOUND1CNT_LO:
                value &= 0x007F;
                audio.writeSquareChannelSweep(0, value);
                break;
            case this.SOUND1CNT_HI:
                audio.writeSquareChannelDLE(0, value);
                break;
            case this.SOUND1CNT_X:
                value &= 0xC7FF;
                audio.writeSquareChannelFC(0, value);
                value &= ~0x8000;
                break;
            case this.SOUND2CNT_LO:
                audio.writeSquareChannelDLE(1, value);
                break;
            case this.SOUND2CNT_HI:
                value &= 0xC7FF;
                audio.writeSquareChannelFC(1, value);
                value &= ~0x8000;
                break;
            case this.SOUND3CNT_LO:
                value &= 0x00E0;
                audio.writeChannel3Lo(value);
                break;
            case this.SOUND3CNT_HI:
                value &= 0xE0FF;
                audio.writeChannel3Hi(value);
                break;
            case this.SOUND3CNT_X:
                value &= 0xC7FF;
                audio.writeChannel3X(value);
                value &= ~0x8000;
                break;
            case this.SOUND4CNT_LO:
                value &= 0xFF3F;
                audio.writeChannel4LE(value);
                break;
            case this.SOUND4CNT_HI:
                value &= 0xC0FF;
                audio.writeChannel4FC(value);
                value &= ~0x8000;
                break;
            case this.SOUNDCNT_LO:
                value &= 0xFF77;
                audio.writeSoundControlLo(value);
                break;
            case this.SOUNDCNT_HI:
                value &= 0xFF0F;
                audio.writeSoundControlHi(value);
                break;
            case this.SOUNDCNT_X:
                value &= 0x0080;
                audio.writeEnable(value);
                break;
            case this.WAVE_RAM0_LO:
            case this.WAVE_RAM0_HI:
            case this.WAVE_RAM1_LO:
            case this.WAVE_RAM1_HI:
            case this.WAVE_RAM2_LO:
            case this.WAVE_RAM2_HI:
            case this.WAVE_RAM3_LO:
            case this.WAVE_RAM3_HI:
                audio.writeWaveData(offset - this.WAVE_RAM0_LO, value, 2);
                break;
            default:
                return {
                    goReturn: false,
                    handle: true
                };
        }
        return {
            goReturn: false,
            handle: true
        };
    }

    private handleDMA(offset: number, value: number): store16DelegateResult {
        if (!this.registers) {
            throw new Error("register no init");
        }
        const irq = this.getIRQ();
        switch (offset) {
            // DMA
            case this.DMA0SAD_LO:
            case this.DMA0DAD_LO:
            case this.DMA1SAD_LO:
            case this.DMA1DAD_LO:
            case this.DMA2SAD_LO:
            case this.DMA2DAD_LO:
            case this.DMA3SAD_LO:
            case this.DMA3DAD_LO:
                this.store32(offset, (this.registers[(offset >> 1) + 1] << 16) | value);
                return {
                    goReturn: true,
                    handle: true
                };

            case this.DMA0SAD_HI:
            case this.DMA0DAD_HI:
            case this.DMA1SAD_HI:
            case this.DMA1DAD_HI:
            case this.DMA2SAD_HI:
            case this.DMA2DAD_HI:
            case this.DMA3SAD_HI:
            case this.DMA3DAD_HI:
                this.store32(offset - 2, this.registers[(offset >> 1) - 1] | (value << 16));
                return {
                    goReturn: true,
                    handle: true
                };

            case this.DMA0CNT_LO:
                irq.dmaSetWordCount(0, value);
                break;
            case this.DMA0CNT_HI:
                // The DMA registers need to set the values before writing the control, as writing the
                // control can synchronously trigger a DMA transfer
                this.registers[offset >> 1] = value & 0xFFE0;
                irq.dmaWriteControl(0, value);
                return {
                    goReturn: true,
                    handle: true
                };
            case this.DMA1CNT_LO:
                irq.dmaSetWordCount(1, value);
                break;
            case this.DMA1CNT_HI:
                this.registers[offset >> 1] = value & 0xFFE0;
                irq.dmaWriteControl(1, value);
                return {
                    goReturn: true,
                    handle: true
                };
            case this.DMA2CNT_LO:
                irq.dmaSetWordCount(2, value);
                break;
            case this.DMA2CNT_HI:
                this.registers[offset >> 1] = value & 0xFFE0;
                irq.dmaWriteControl(2, value);
                return {
                    goReturn: true,
                    handle: true
                };
            case this.DMA3CNT_LO:
                irq.dmaSetWordCount(3, value);
                break;
            case this.DMA3CNT_HI:
                this.registers[offset >> 1] = value & 0xFFE0;
                irq.dmaWriteControl(3, value);
                return {
                    goReturn: true,
                    handle: true
                };
            default:
                return {
                    goReturn: false,
                    handle: false
                };
        }

        return {
            goReturn: false,
            handle: true
        };
    }

    private handleTimer(offset: number, value: number): store16DelegateResult {
        const irq = this.getIRQ();
        switch (offset) {
            // Timers
            case this.TM0CNT_LO:
                irq.timerSetReload(0, value);
                return {
                    goReturn: true,
                    handle: true
                };
            case this.TM1CNT_LO:
                irq.timerSetReload(1, value);
                return {
                    goReturn: true,
                    handle: true
                };
            case this.TM2CNT_LO:
                irq.timerSetReload(2, value);
                return {
                    goReturn: true,
                    handle: true
                };
            case this.TM3CNT_LO:
                irq.timerSetReload(3, value);
                return {
                    goReturn: true,
                    handle: true
                };

            case this.TM0CNT_HI:
                value &= 0x00C7
                irq.timerWriteControl(0, value);
                break;
            case this.TM1CNT_HI:
                value &= 0x00C7
                irq.timerWriteControl(1, value);
                break;
            case this.TM2CNT_HI:
                value &= 0x00C7
                irq.timerWriteControl(2, value);
                break;
            case this.TM3CNT_HI:
                value &= 0x00C7
                irq.timerWriteControl(3, value);
                break;
            default:
                return {
                    goReturn: false,
                    handle: false
                };
        }
        return {
            goReturn: false,
            handle: true
        };
    }

    private handleSIO(offset: number, value: number): store16DelegateResult {
        if (!this.registers) {
            throw new Error("register no init");
        }

        const sio = this.getSIO();
        switch (offset) {
            // SIO
            case this.SIOMULTI0:
            case this.SIOMULTI1:
            case this.SIOMULTI2:
            case this.SIOMULTI3:
            case this.SIODATA8:
                this.STUB_REG('SIO', offset);
                break;
            case this.RCNT:
                sio.setMode(((value >> 12) & 0xC) | ((this.registers[this.SIOCNT >> 1] >> 12) & 0x3));
                sio.writeRCNT(value);
                break;
            case this.SIOCNT:
                sio.setMode(((value >> 12) & 0x3) | ((this.registers[this.RCNT >> 1] >> 12) & 0xC));
                sio.writeSIOCNT(value);
                return {
                    goReturn: true,
                    handle: true
                };
            case this.JOYCNT:
            case this.JOYSTAT:
                this.STUB_REG('JOY', offset);
                break;
            default:
                return {
                    goReturn: false,
                    handle: false
                };
        }
        return {
            goReturn: false,
            handle: true
        };
    }

    private handleMisc(offset: number, value: number): store16DelegateResult {
        if (!this.registers) {
            throw new Error("register no init");
        }
        const irq = this.getIRQ();
        switch (offset) {
            // Misc
            case this.IE:
                value &= 0x3FFF;
                irq.setInterruptsEnabled(value > 0);
                break;
            case this.IF:
                irq.dismissIRQs(value);
                return {
                    goReturn: true,
                    handle: true
                };
            case this.WAITCNT:
                value &= 0xDFFF;
                this.getCPU().mmu.adjustTimings(value);
                break;
            case this.IME:
                value &= 0x0001;
                irq.masterEnable(value > 0);
                break;
            default:
                return {
                    goReturn: false,
                    handle: false
                };
        }

        return {
            goReturn: false,
            handle: true
        };
    }

    store16(offset: number, value: number): void {
        if (!this.registers) {
            throw new Error("register no init");
        }

        const render = this.getVideoRender();
        const audio = this.getAudio();
        const video = this.getVideo();
        const irq = this.getIRQ();
        const sio = this.getSIO();
        switch (offset) {
            // Video
            case this.DISPCNT:
                render.writeDisplayControl(value);
                break;
            case this.DISPSTAT:
                value &= video.DISPSTAT_MASK;
                video.writeDisplayStat(value);
                break;
            case this.BG0CNT:
                render.writeBackgroundControl(0, value);
                break;
            case this.BG1CNT:
                render.writeBackgroundControl(1, value);
                break;
            case this.BG2CNT:
                render.writeBackgroundControl(2, value);
                break;
            case this.BG3CNT:
                render.writeBackgroundControl(3, value);
                break;
            case this.BG0HOFS:
                render.writeBackgroundHOffset(0, value);
                break;
            case this.BG0VOFS:
                render.writeBackgroundVOffset(0, value);
                break;
            case this.BG1HOFS:
                render.writeBackgroundHOffset(1, value);
                break;
            case this.BG1VOFS:
                render.writeBackgroundVOffset(1, value);
                break;
            case this.BG2HOFS:
                render.writeBackgroundHOffset(2, value);
                break;
            case this.BG2VOFS:
                render.writeBackgroundVOffset(2, value);
                break;
            case this.BG3HOFS:
                render.writeBackgroundHOffset(3, value);
                break;
            case this.BG3VOFS:
                render.writeBackgroundVOffset(3, value);
                break;
            case this.BG2X_LO:
                render.writeBackgroundRefX(2, (this.registers[(offset >> 1) | 1] << 16) | value);
                break;
            case this.BG2X_HI:
                render.writeBackgroundRefX(2, this.registers[(offset >> 1) ^ 1] | (value << 16));
                break;
            case this.BG2Y_LO:
                render.writeBackgroundRefY(2, (this.registers[(offset >> 1) | 1] << 16) | value);
                break;
            case this.BG2Y_HI:
                render.writeBackgroundRefY(2, this.registers[(offset >> 1) ^ 1] | (value << 16));
                break;
            case this.BG2PA:
                render.writeBackgroundParamA(2, value);
                break;
            case this.BG2PB:
                render.writeBackgroundParamB(2, value);
                break;
            case this.BG2PC:
                render.writeBackgroundParamC(2, value);
                break;
            case this.BG2PD:
                render.writeBackgroundParamD(2, value);
                break;
            case this.BG3X_LO:
                render.writeBackgroundRefX(3, (this.registers[(offset >> 1) | 1] << 16) | value);
                break;
            case this.BG3X_HI:
                render.writeBackgroundRefX(3, this.registers[(offset >> 1) ^ 1] | (value << 16));
                break;
            case this.BG3Y_LO:
                render.writeBackgroundRefY(3, (this.registers[(offset >> 1) | 1] << 16) | value);
                break;
            case this.BG3Y_HI:
                render.writeBackgroundRefY(3, this.registers[(offset >> 1) ^ 1] | (value << 16));
                break;
            case this.BG3PA:
                render.writeBackgroundParamA(3, value);
                break;
            case this.BG3PB:
                render.writeBackgroundParamB(3, value);
                break;
            case this.BG3PC:
                render.writeBackgroundParamC(3, value);
                break;
            case this.BG3PD:
                render.writeBackgroundParamD(3, value);
                break;
            case this.WIN0H:
                render.writeWin0H(value);
                break;
            case this.WIN1H:
                render.writeWin1H(value);
                break;
            case this.WIN0V:
                render.writeWin0V(value);
                break;
            case this.WIN1V:
                render.writeWin1V(value);
                break;
            case this.WININ:
                value &= 0x3F3F;
                render.writeWinIn(value);
                break;
            case this.WINOUT:
                value &= 0x3F3F;
                render.writeWinOut(value);
                break;
            case this.BLDCNT:
                value &= 0x7FFF;
                render.writeBlendControl(value);
                break;
            case this.BLDALPHA:
                value &= 0x1F1F;
                render.writeBlendAlpha(value);
                break;
            case this.BLDY:
                value &= 0x001F;
                render.writeBlendY(value);
                break;
            case this.MOSAIC:
                render.writeMosaic(value);
                break;

            // Sound
            case this.SOUND1CNT_LO:
                value &= 0x007F;
                audio.writeSquareChannelSweep(0, value);
                break;
            case this.SOUND1CNT_HI:
                audio.writeSquareChannelDLE(0, value);
                break;
            case this.SOUND1CNT_X:
                value &= 0xC7FF;
                audio.writeSquareChannelFC(0, value);
                value &= ~0x8000;
                break;
            case this.SOUND2CNT_LO:
                audio.writeSquareChannelDLE(1, value);
                break;
            case this.SOUND2CNT_HI:
                value &= 0xC7FF;
                audio.writeSquareChannelFC(1, value);
                value &= ~0x8000;
                break;
            case this.SOUND3CNT_LO:
                value &= 0x00E0;
                audio.writeChannel3Lo(value);
                break;
            case this.SOUND3CNT_HI:
                value &= 0xE0FF;
                audio.writeChannel3Hi(value);
                break;
            case this.SOUND3CNT_X:
                value &= 0xC7FF;
                audio.writeChannel3X(value);
                value &= ~0x8000;
                break;
            case this.SOUND4CNT_LO:
                value &= 0xFF3F;
                audio.writeChannel4LE(value);
                break;
            case this.SOUND4CNT_HI:
                value &= 0xC0FF;
                audio.writeChannel4FC(value);
                value &= ~0x8000;
                break;
            case this.SOUNDCNT_LO:
                value &= 0xFF77;
                audio.writeSoundControlLo(value);
                break;
            case this.SOUNDCNT_HI:
                value &= 0xFF0F;
                audio.writeSoundControlHi(value);
                break;
            case this.SOUNDCNT_X:
                value &= 0x0080;
                audio.writeEnable(value);
                break;
            case this.WAVE_RAM0_LO:
            case this.WAVE_RAM0_HI:
            case this.WAVE_RAM1_LO:
            case this.WAVE_RAM1_HI:
            case this.WAVE_RAM2_LO:
            case this.WAVE_RAM2_HI:
            case this.WAVE_RAM3_LO:
            case this.WAVE_RAM3_HI:
                audio.writeWaveData(offset - this.WAVE_RAM0_LO, value, 2);
                break;

            // DMA
            case this.DMA0SAD_LO:
            case this.DMA0DAD_LO:
            case this.DMA1SAD_LO:
            case this.DMA1DAD_LO:
            case this.DMA2SAD_LO:
            case this.DMA2DAD_LO:
            case this.DMA3SAD_LO:
            case this.DMA3DAD_LO:
                this.store32(offset, (this.registers[(offset >> 1) + 1] << 16) | value);
                return;

            case this.DMA0SAD_HI:
            case this.DMA0DAD_HI:
            case this.DMA1SAD_HI:
            case this.DMA1DAD_HI:
            case this.DMA2SAD_HI:
            case this.DMA2DAD_HI:
            case this.DMA3SAD_HI:
            case this.DMA3DAD_HI:
                this.store32(offset - 2, this.registers[(offset >> 1) - 1] | (value << 16));
                return;

            case this.DMA0CNT_LO:
                irq.dmaSetWordCount(0, value);
                break;
            case this.DMA0CNT_HI:
                // The DMA registers need to set the values before writing the control, as writing the
                // control can synchronously trigger a DMA transfer
                this.registers[offset >> 1] = value & 0xFFE0;
                irq.dmaWriteControl(0, value);
                return;
            case this.DMA1CNT_LO:
                irq.dmaSetWordCount(1, value);
                break;
            case this.DMA1CNT_HI:
                this.registers[offset >> 1] = value & 0xFFE0;
                irq.dmaWriteControl(1, value);
                return;
            case this.DMA2CNT_LO:
                irq.dmaSetWordCount(2, value);
                break;
            case this.DMA2CNT_HI:
                this.registers[offset >> 1] = value & 0xFFE0;
                irq.dmaWriteControl(2, value);
                return;
            case this.DMA3CNT_LO:
                irq.dmaSetWordCount(3, value);
                break;
            case this.DMA3CNT_HI:
                this.registers[offset >> 1] = value & 0xFFE0;
                irq.dmaWriteControl(3, value);
                return;

            // Timers
            case this.TM0CNT_LO:
                irq.timerSetReload(0, value);
                return;
            case this.TM1CNT_LO:
                irq.timerSetReload(1, value);
                return;
            case this.TM2CNT_LO:
                irq.timerSetReload(2, value);
                return;
            case this.TM3CNT_LO:
                irq.timerSetReload(3, value);
                return;

            case this.TM0CNT_HI:
                value &= 0x00C7
                irq.timerWriteControl(0, value);
                break;
            case this.TM1CNT_HI:
                value &= 0x00C7
                irq.timerWriteControl(1, value);
                break;
            case this.TM2CNT_HI:
                value &= 0x00C7
                irq.timerWriteControl(2, value);
                break;
            case this.TM3CNT_HI:
                value &= 0x00C7
                irq.timerWriteControl(3, value);
                break;

            // SIO
            case this.SIOMULTI0:
            case this.SIOMULTI1:
            case this.SIOMULTI2:
            case this.SIOMULTI3:
            case this.SIODATA8:
                this.STUB_REG('SIO', offset);
                break;
            case this.RCNT:
                sio.setMode(((value >> 12) & 0xC) | ((this.registers[this.SIOCNT >> 1] >> 12) & 0x3));
                sio.writeRCNT(value);
                break;
            case this.SIOCNT:
                sio.setMode(((value >> 12) & 0x3) | ((this.registers[this.RCNT >> 1] >> 12) & 0xC));
                sio.writeSIOCNT(value);
                return;
            case this.JOYCNT:
            case this.JOYSTAT:
                this.STUB_REG('JOY', offset);
                break;

            // Misc
            case this.IE:
                value &= 0x3FFF;
                irq.setInterruptsEnabled(value > 0);
                break;
            case this.IF:
                irq.dismissIRQs(value);
                return;
            case this.WAITCNT:
                value &= 0xDFFF;
                this.getCPU().mmu.adjustTimings(value);
                break;
            case this.IME:
                value &= 0x0001;
                irq.masterEnable(value > 0);
                break;
            default:
                this.STUB_REG('I/O', offset);
        }
        this.registers[offset >> 1] = value;
    }

    /**
     * 
     * @param offset 
     * @param value 
     */
    store32(offset: number, value: number): void {
        // const video = this.getVideo();
        const audio = this.getAudio();
        const render = this.getVideoRender();
        const irq = this.getIRQ();
        switch (offset) {
            case this.BG2X_LO:
                value &= 0x0FFFFFFF;
                render.writeBackgroundRefX(2, value);
                break;
            case this.BG2Y_LO:
                value &= 0x0FFFFFFF;
                render.writeBackgroundRefY(2, value);
                break;
            case this.BG3X_LO:
                value &= 0x0FFFFFFF;
                render.writeBackgroundRefX(3, value);
                break;
            case this.BG3Y_LO:
                value &= 0x0FFFFFFF;
                render.writeBackgroundRefY(3, value);
                break;
            case this.DMA0SAD_LO:
                irq.dmaSetSourceAddress(0, value);
                break;
            case this.DMA0DAD_LO:
                irq.dmaSetDestAddress(0, value);
                break;
            case this.DMA1SAD_LO:
                irq.dmaSetSourceAddress(1, value);
                break;
            case this.DMA1DAD_LO:
                irq.dmaSetDestAddress(1, value);
                break;
            case this.DMA2SAD_LO:
                irq.dmaSetSourceAddress(2, value);
                break;
            case this.DMA2DAD_LO:
                irq.dmaSetDestAddress(2, value);
                break;
            case this.DMA3SAD_LO:
                irq.dmaSetSourceAddress(3, value);
                break;
            case this.DMA3DAD_LO:
                irq.dmaSetDestAddress(3, value);
                break;
            case this.FIFO_A_LO:
                audio.appendToFifoA(value);
                return;
            case this.FIFO_B_LO:
                audio.appendToFifoB(value);
                return;

            // High bits of this write should be ignored
            case this.IME:
                this.store16(offset, value & 0xFFFF);
                return;
            case this.JOY_RECV:
            case this.JOY_TRANS:
                this.STUB_REG('JOY', offset);
                return;
            default:
                this.store16(offset, value & 0xFFFF);
                this.store16(offset | 2, value >>> 16);
                return;
        }

        if (!this.registers) {
            throw new Error("register no init");
        }

        this.registers[offset >> 1] = value & 0xFFFF;
        this.registers[(offset >> 1) + 1] = value >>> 16;
    }

    /**
     * 
     * @param address 
     */
    invalidatePage(address: number): void { }

    /**
     * 
     * @param type 
     * @param offset 
     */
    STUB_REG(type: string, offset: number): void {
        (this.core as ILog).STUB('Unimplemented ' + type + ' register write: ' + offset.toString(16));
    }

}