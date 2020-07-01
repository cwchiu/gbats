import { IAudio, ILog, ICloseData, IClose, IGBA, IClear, ICPU, IGBAMMU, DMANumber, IIRQ, IIO, NumberHashtable, IContext } from "../interfaces.ts";

interface IJSAudio {
    onaudioprocess(e: IAudioProcessingEvent): void
    disconnect(e: unknown): void
    connect(e: unknown): void
}

interface createJSAudio {
    (size: number): IJSAudio
}

interface IOutputBuffer {
    getChannelData(value: number): NumberHashtable<number>
}

interface IAudioProcessingEvent {
    outputBuffer: IOutputBuffer
}

interface IAudioContext {
    createScriptProcessor?: createJSAudio
    createJavaScriptNode?: createJSAudio
    destination: unknown
    sampleRate: number
}

interface IEnvelopeChannel {
    nextStep: number
    step: number
    increment: number
    volume: number
}

interface ILLEChannel {
    length: number
    increment: number
    step: number
    initialVolume: number
}

interface IChannel extends IEnvelopeChannel, ILLEChannel {
    enabled: boolean
    playing: boolean
    sample: number
    duty: number
    frequency: number
    interval: number
    sweepSteps: number
    sweepIncrement: number
    sweepInterval: number
    doSweep: boolean
    raise: number
    lower: number

    timed: boolean
    end: number
    nextSweep: number
}

interface IChannel4 extends IEnvelopeChannel, ILLEChannel {
    width: number
    lfsr: number
    next: number
    sample: number
    interval: number
    timed: boolean
    end: number
}

export default class GameBoyAdvanceAudio implements IAudio, IClose, IClear {

    readonly SOUND_MAX = 0x400;
    readonly FIFO_MAX = 0x200;
    readonly PSG_MAX = 0x080;
    masterVolume: number
    masterEnable: boolean
    bufferSize: number = 0
    maxSamples: number = 0
    sampleMask: number = 0
    jsAudio: IJSAudio | null = null
    context: IAudioContext | null = null;
    buffers: Float32Array[] = []

    nextEvent: number = 0
    nextSample: number = 0
    samplePointer: number = 0
    backup: number = 0
    outputPointer: number = 0
    totalSamples: number = 0
    sampleRate: number = 0
    sampleInterval: number = 0
    resampleRatio: number = 0
    cpuFrequency: number = 0
    waveData: Uint8Array = new Uint8Array(0)
    channel3Dimension: number = 0
    channel3Bank: number = 0
    channel3Volume: number = 0
    channel3Interval: number = 0
    channel3Next: number = 0
    channel3Length: number = 0
    channel3Timed: boolean = false
    channel3End: number = 0
    channel3Pointer: number = 0
    channel3Sample: number = 0

    enableChannel3: number = 0
    masterVolumeLeft: number = 0
    masterVolumeRight: number = 0
    enabledLeft: number = 0
    enabledRight: number = 0

    // enableChannel3: boolean = false;
    enableChannel4: boolean = false;
    enableChannelA: boolean = false;
    enableChannelB: boolean = false;
    enableRightChannelA: boolean = false;
    enableLeftChannelA: boolean = false;
    enableRightChannelB: boolean = false;
    enableLeftChannelB: boolean = false;

    playingChannel3: boolean = false;
    playingChannel4: boolean = false;

    volumeLeft: number = 0;
    volumeRight: number = 0;

    ratioChannelA: number = 0;
    ratioChannelB: number = 0;

    dmaA: number = 0
    dmaB: number = 0
    soundTimerA: number = 0
    soundTimerB: number = 0

    fifoASample: number = 0
    fifoBSample: number = 0
    soundRatio: number = 0
    soundBias: number = 0x200
    enabled: boolean = false
    squareChannels: IChannel[] = []
    channel4: IChannel4 | null = null

    core: ILog | IGBA | IContext | null = null
    cpu: ICPU | null = null
    fifoA: number[] = []
    fifoB: number[] = []
    channel3Write: boolean = false

    constructor() {
        this.setupNativeAudio();

        if (this.context) {
            this.bufferSize = 0;
            this.bufferSize = 4096;
            this.maxSamples = this.bufferSize << 2;
            this.buffers = [new Float32Array(this.maxSamples), new Float32Array(this.maxSamples)];
            this.sampleMask = this.maxSamples - 1;
        }

        this.masterEnable = true;
        this.masterVolume = 1.0;
    }

    private setupNativeAudio(): void {
        // @ts-ignore
        window.AudioContext = window.AudioContext || window.webkitAudioContext;

        // @ts-ignore
        if (window.AudioContext) {
            // @ts-ignore
            this.context = new AudioContext();
            if (!this.context) {
                throw new Error("audio context init fail");
            }

            const factory = this.context.createScriptProcessor || this.context.createJavaScriptNode;
            if (!factory) {
                throw new Error("audio context init fail");
            }

            this.jsAudio = factory.call(this.context, this.bufferSize);

            const self = this;
            this.jsAudio.onaudioprocess = function (e: IAudioProcessingEvent) { self.audioProcess(e) };
        } else {
            this.context = null;
        }

    }

    clear() {
        this.fifoA = [];
        this.fifoB = [];
        this.fifoASample = 0;
        this.fifoBSample = 0;

        this.enabled = false;
        if (this.context) {
            try {
                this.getJsAudio().disconnect(this.context.destination);
            } catch (e) {
            }
        }

        this.enableChannel3 = 0;
        this.enableChannel4 = false;
        this.enableChannelA = false;
        this.enableChannelB = false;
        this.enableRightChannelA = false;
        this.enableLeftChannelA = false;
        this.enableRightChannelB = false;
        this.enableLeftChannelB = false;

        this.playingChannel3 = false;
        this.playingChannel4 = false;

        this.volumeLeft = 0;
        this.volumeRight = 0;
        this.ratioChannelA = 1;
        this.ratioChannelB = 1;
        this.enabledLeft = 0;
        this.enabledRight = 0;

        this.dmaA = -1;
        this.dmaB = -1;
        this.soundTimerA = 0;
        this.soundTimerB = 0;

        this.soundRatio = 1;
        this.soundBias = 0x200;

        this.squareChannels = [];

        for (let i = 0; i < 2; ++i) {
            this.squareChannels[i] = {
                nextSweep: 0,
                enabled: false,
                playing: false,
                sample: 0,
                duty: 0.5,
                increment: 0,
                step: 0,
                initialVolume: 0,
                volume: 0,
                frequency: 0,
                interval: 0,
                sweepSteps: 0,
                sweepIncrement: 0,
                sweepInterval: 0,
                doSweep: false,
                raise: 0,
                lower: 0,
                nextStep: 0,
                timed: false,
                length: 0,
                end: 0
            }
        }

        this.waveData = new Uint8Array(32);
        this.channel3Dimension = 0;
        this.channel3Bank = 0;
        this.channel3Volume = 0;
        this.channel3Interval = 0;
        this.channel3Next = 0;
        this.channel3Length = 0;
        this.channel3Timed = false;
        this.channel3End = 0;
        this.channel3Pointer = 0;
        this.channel3Sample = 0;

        this.cpuFrequency = this.getIRQ().FREQUENCY;

        this.channel4 = {
            sample: 0,
            lfsr: 0,
            width: 15,
            interval: this.cpuFrequency / 524288,
            increment: 0,
            step: 0,
            initialVolume: 0,
            volume: 0,
            nextStep: 0,
            timed: false,
            length: 0,
            end: 0,
            next: 0
        };

        this.nextEvent = 0;

        this.nextSample = 0;
        this.outputPointer = 0;
        this.samplePointer = 0;

        this.backup = 0;
        this.totalSamples = 0;

        this.sampleRate = 32768;
        this.sampleInterval = this.cpuFrequency / this.sampleRate;
        this.resampleRatio = 1;
        if (this.context) {
            this.resampleRatio = this.sampleRate / this.context.sampleRate;
        }

        this.writeSquareChannelFC(0, 0);
        this.writeSquareChannelFC(1, 0);
        this.writeChannel4FC(0);
    }

    private getGBA(): IGBA {
        return this.core as IGBA;
    }

    freeze(): ICloseData {
        return {
            nextSample: this.nextSample
        };
    }

    defrost(frost: ICloseData): void {
        this.nextSample = frost.nextSample;
    }

    private getJsAudio(): IJSAudio {
        if (!this.jsAudio) {
            throw new Error("jsaudio no init");
        }
        return this.jsAudio;
    }

    pause(paused: boolean): void {
        if (this.context) {
            if (paused) {
                try {
                    this.getJsAudio().disconnect(this.context.destination);
                } catch (e) {
                    // Sigh
                }
            } else if (this.enabled) {
                this.getJsAudio().connect(this.context.destination);
            }
        }
    }

    private getCPU(): ICPU {
        if (!this.cpu) {
            throw new Error("cpu no init");
        }
        return this.cpu;
    }

    updateTimers() {
        var cycles = this.getCPU().cycles;
        if (!this.enabled || (cycles < this.nextEvent && cycles < this.nextSample)) {
            return;
        }

        if (cycles >= this.nextEvent) {
            var channel = this.squareChannels[0];
            this.nextEvent = Infinity;
            if (channel.playing) {
                this.updateSquareChannel(channel, cycles);
            }

            channel = this.squareChannels[1];
            if (channel.playing) {
                this.updateSquareChannel(channel, cycles);
            }

            if (this.enableChannel3 && this.playingChannel3) {
                if (cycles >= this.channel3Next) {
                    if (this.channel3Write) {
                        var sample = this.waveData[this.channel3Pointer >> 1];
                        this.channel3Sample = (((sample >> ((this.channel3Pointer & 1) << 2)) & 0xF) - 0x8) / 8;
                        this.channel3Pointer = (this.channel3Pointer + 1);
                        if (this.channel3Dimension && this.channel3Pointer >= 64) {
                            this.channel3Pointer -= 64;
                        } else if (!this.channel3Bank && this.channel3Pointer >= 32) {
                            this.channel3Pointer -= 32;
                        } else if (this.channel3Pointer >= 64) {
                            this.channel3Pointer -= 32;
                        }
                    }
                    this.channel3Next += this.channel3Interval;
                    if (this.channel3Interval && this.nextEvent > this.channel3Next) {
                        this.nextEvent = this.channel3Next;
                    }
                }
                if (this.channel3Timed && cycles >= this.channel3End) {
                    this.playingChannel3 = false;
                }
            }

            const channel4 = this.getChannel4();
            if (this.enableChannel4 && this.playingChannel4) {
                if (channel4.timed && cycles >= channel4.end) {
                    this.playingChannel4 = false;
                } else {
                    if (cycles >= channel4.next) {
                        channel4.lfsr >>= 1;
                        var sample = channel4.lfsr & 1;
                        channel4.lfsr |= (((channel4.lfsr >> 1) & 1) ^ sample) << (channel4.width - 1);
                        channel4.next += channel4.interval;
                        channel4.sample = (sample - 0.5) * 2 * channel4.volume;
                    }
                    this.updateEnvelope(channel4, cycles);
                    if (this.nextEvent > channel4.next) {
                        this.nextEvent = channel4.next;
                    }
                    if (channel4.timed && this.nextEvent > channel4.end) {
                        this.nextEvent = channel4.end;
                    }
                }
            }
        }

        if (cycles >= this.nextSample) {
            this.sample();
            this.nextSample += this.sampleInterval;
        }

        this.nextEvent = Math.ceil(this.nextEvent);
        if ((this.nextEvent < cycles) || (this.nextSample < cycles)) {
            // STM instructions may take a long time
            this.updateTimers();
        }
    }

    private getChannel4(): IChannel4 {
        if (!this.channel4) {
            throw new Error("channel4 no init");
        }
        return this.channel4;
    }

    /**
     * 
     * @param value 
     */
    writeEnable(value: number): void {
        this.enabled = !!value;
        this.nextEvent = this.getCPU().cycles;
        this.nextSample = this.nextEvent;
        this.updateTimers();
        this.getIRQ().pollNextEvent();
        if (this.context) {
            if (this.enabled) {
                this.getJsAudio().connect(this.context.destination);
            } else {
                try {
                    this.getJsAudio().disconnect(this.context.destination);
                } catch (e) {
                }
            }
        }
    }

    /**
     * 
     * @param value 
     */
    writeSoundControlLo(value: number): void {
        this.masterVolumeLeft = value & 0x7;
        this.masterVolumeRight = (value >> 4) & 0x7;
        this.enabledLeft = (value >> 8) & 0xF;
        this.enabledRight = (value >> 12) & 0xF;

        this.setSquareChannelEnabled(this.squareChannels[0], ((this.enabledLeft | this.enabledRight) & 0x1) > 0);
        this.setSquareChannelEnabled(this.squareChannels[1], ((this.enabledLeft | this.enabledRight) & 0x2) > 0);
        this.enableChannel3 = (this.enabledLeft | this.enabledRight) & 0x4;
        this.setChannel4Enabled(((this.enabledLeft | this.enabledRight) & 0x8) > 0);

        this.updateTimers();
        this.getIRQ().pollNextEvent();
    }

    /**
     * 
     * @param value 
     */
    writeSoundControlHi(value: number): void {
        switch (value & 0x0003) {
            case 0:
                this.soundRatio = 0.25;
                break;
            case 1:
                this.soundRatio = 0.50;
                break;
            case 2:
                this.soundRatio = 1;
                break;
        }
        this.ratioChannelA = (((value & 0x0004) >> 2) + 1) * 0.5;
        this.ratioChannelB = (((value & 0x0008) >> 3) + 1) * 0.5;

        this.enableRightChannelA = (value & 0x0100) > 0;
        this.enableLeftChannelA = (value & 0x0200) > 0;
        this.enableChannelA = (value & 0x0300) > 0;
        this.soundTimerA = value & 0x0400;
        if (value & 0x0800) {
            this.fifoA = [];
        }
        this.enableRightChannelB = (value & 0x1000) > 0;
        this.enableLeftChannelB = (value & 0x2000) > 0;
        this.enableChannelB = (value & 0x3000) > 0;
        this.soundTimerB = value & 0x4000;
        if (value & 0x8000) {
            this.fifoB = [];
        }
    }

    /**
     * 
     * @param channel 
     */
    resetSquareChannel(channel: IChannel): void {
        const cpu = this.getCPU();
        if (channel.step) {
            channel.nextStep = cpu.cycles + channel.step;
        }
        if (channel.enabled && !channel.playing) {
            channel.raise = cpu.cycles;
            channel.lower = channel.raise + channel.duty * channel.interval;
            channel.end = cpu.cycles + channel.length;
            this.nextEvent = cpu.cycles;
        }
        channel.playing = channel.enabled;
        this.updateTimers();
        this.getIRQ().pollNextEvent();
    }

    /**
     * 
     * @param channel 
     * @param enable 
     */
    setSquareChannelEnabled(channel: IChannel, enable: boolean): void {
        if (!(channel.enabled && channel.playing) && enable) {
            channel.enabled = !!enable;
            this.updateTimers();
            this.getIRQ().pollNextEvent();
        } else {
            channel.enabled = !!enable;
        }
    }

    /**
     * 
     * @param channelId 
     * @param value 
     */
    writeSquareChannelSweep(channelId: number, value: number): void {
        const channel = this.squareChannels[channelId];
        channel.sweepSteps = value & 0x07;
        channel.sweepIncrement = (value & 0x08) ? -1 : 1;
        channel.sweepInterval = ((value >> 4) & 0x7) * this.cpuFrequency / 128;
        channel.doSweep = !!channel.sweepInterval;
        channel.nextSweep = this.getCPU().cycles + channel.sweepInterval;
        this.resetSquareChannel(channel);
    }

    /**
     * 
     */
    writeSquareChannelDLE(channelId: number, value: number): void {
        const channel = this.squareChannels[channelId];
        const duty = (value >> 6) & 0x3;
        switch (duty) {
            case 0:
                channel.duty = 0.125;
                break;
            case 1:
                channel.duty = 0.25;
                break;
            case 2:
                channel.duty = 0.5;
                break;
            case 3:
                channel.duty = 0.75;
                break;
        }
        this.writeChannelLE(channel, value);
        this.resetSquareChannel(channel);
    }

    /**
     * 
     * @param channelId 
     * @param value 
     */
    writeSquareChannelFC(channelId: number, value: number): void {
        var channel = this.squareChannels[channelId];
        var frequency = value & 2047;
        channel.frequency = frequency;
        channel.interval = this.cpuFrequency * (2048 - frequency) / 131072;
        channel.timed = !!(value & 0x4000);

        if (value & 0x8000) {
            this.resetSquareChannel(channel);
            channel.volume = channel.initialVolume;
        }
    }

    /**
     * 
     * @param channel 
     * @param cycles 
     */
    updateSquareChannel(channel: IChannel, cycles: number): void {
        if (channel.timed && cycles >= channel.end) {
            channel.playing = false;
            return;
        }

        if (channel.doSweep && cycles >= channel.nextSweep) {
            channel.frequency += channel.sweepIncrement * (channel.frequency >> channel.sweepSteps);
            if (channel.frequency < 0) {
                channel.frequency = 0;
            } else if (channel.frequency > 2047) {
                channel.frequency = 2047;
                channel.playing = false;
                return;
            }
            channel.interval = this.cpuFrequency * (2048 - channel.frequency) / 131072;
            channel.nextSweep += channel.sweepInterval;
        }

        if (cycles >= channel.raise) {
            channel.sample = channel.volume;
            channel.lower = channel.raise + channel.duty * channel.interval;
            channel.raise += channel.interval;
        } else if (cycles >= channel.lower) {
            channel.sample = -channel.volume;
            channel.lower += channel.interval;
        }

        this.updateEnvelope(channel as IEnvelopeChannel, cycles);

        if (this.nextEvent > channel.raise) {
            this.nextEvent = channel.raise;
        }
        if (this.nextEvent > channel.lower) {
            this.nextEvent = channel.lower;
        }
        if (channel.timed && this.nextEvent > channel.end) {
            this.nextEvent = channel.end;
        }
        if (channel.doSweep && this.nextEvent > channel.nextSweep) {
            this.nextEvent = channel.nextSweep;
        }
    }

    /**
     * 
     * @param value 
     */
    writeChannel3Lo(value: number): void {
        this.channel3Dimension = value & 0x20;
        this.channel3Bank = value & 0x40;
        var enable = value & 0x80;
        if (!this.channel3Write && enable) {
            this.channel3Write = enable > 0;
            this.resetChannel3();
        } else {
            this.channel3Write = enable > 0;
        }
    }

    /**
     * 
     * @param value 
     */
    writeChannel3Hi(value: number): void {
        this.channel3Length = this.cpuFrequency * (0x100 - (value & 0xFF)) / 256;
        var volume = (value >> 13) & 0x7;
        switch (volume) {
            case 0:
                this.channel3Volume = 0;
                break;
            case 1:
                this.channel3Volume = 1;
                break;
            case 2:
                this.channel3Volume = 0.5;
                break;
            case 3:
                this.channel3Volume = 0.25;
                break;
            default:
                this.channel3Volume = 0.75;
        }
    }

    /**
     * 
     * @param value 
     */
    writeChannel3X(value: number): void {
        this.channel3Interval = this.cpuFrequency * (2048 - (value & 0x7FF)) / 2097152;
        this.channel3Timed = !!(value & 0x4000);
        if (this.channel3Write) {
            this.resetChannel3();
        }
    }

    /**
     * 
     */
    resetChannel3(): void {
        const cpu = this.getCPU();
        this.channel3Next = cpu.cycles;
        this.nextEvent = this.channel3Next;
        this.channel3End = cpu.cycles + this.channel3Length;
        this.playingChannel3 = this.channel3Write;
        this.updateTimers();
        this.getIRQ().pollNextEvent();
    }

    /**
     * 
     * @param offset 
     * @param data 
     * @param width 
     */
    writeWaveData(offset: number, data: number, width: number): void {
        if (!this.channel3Bank) {
            offset += 16;
        }
        if (width == 2) {
            this.waveData[offset] = data & 0xFF;
            data >>= 8;
            ++offset;
        }
        this.waveData[offset] = data & 0xFF;
    }

    setChannel4Enabled(enable: boolean): void {
        if (!this.enableChannel4 && enable) {
            const cpu = this.getCPU();
            const channel4 = this.getChannel4();
            channel4.next = cpu.cycles;
            channel4.end = cpu.cycles + channel4.length;
            this.enableChannel4 = true;
            this.playingChannel4 = true;
            this.nextEvent = cpu.cycles;
            this.updateEnvelope(channel4);
            this.updateTimers();
            this.getIRQ().pollNextEvent();
        } else {
            this.enableChannel4 = enable;
        }
    }

    /**
     * 
     * @param value 
     */
    writeChannel4LE(value: number): void {
        this.writeChannelLE(this.getChannel4(), value);
        this.resetChannel4();
    }

    /**
     * 
     * @param value 
     */
    writeChannel4FC(value: number): void {
        const channel4 = this.getChannel4();
        channel4.timed = !!(value & 0x4000);

        var r = value & 0x7;
        if (!r) {
            r = 0.5;
        }
        var s = (value >> 4) & 0xF;
        var interval = this.cpuFrequency * (r * (2 << s)) / 524288;
        if (interval != channel4.interval) {
            channel4.interval = interval;
            this.resetChannel4();
        }

        var width = (value & 0x8) ? 7 : 15;
        if (width != channel4.width) {
            channel4.width = width;
            this.resetChannel4();
        }

        if (value & 0x8000) {
            this.resetChannel4();
        }
    }

    resetChannel4(): void {
        const channel4 = this.getChannel4();
        if (channel4.width == 15) {
            channel4.lfsr = 0x4000;
        } else {
            channel4.lfsr = 0x40;
        }
        channel4.volume = channel4.initialVolume;
        const cpu = this.getCPU();
        if (channel4.step) {
            channel4.nextStep = cpu.cycles + channel4.step;
        }
        channel4.end = cpu.cycles + channel4.length;
        channel4.next = cpu.cycles;
        this.nextEvent = channel4.next;

        this.playingChannel4 = this.enableChannel4;
        this.updateTimers();
        this.getIRQ().pollNextEvent();
    }

    /**
     * 
     * @param channel 
     * @param value 
     */
    private writeChannelLE(channel: ILLEChannel, value: number): void {
        channel.length = this.cpuFrequency * ((0x40 - (value & 0x3F)) / 256);

        if (value & 0x0800) {
            channel.increment = 1 / 16;
        } else {
            channel.increment = -1 / 16;
        }
        channel.initialVolume = ((value >> 12) & 0xF) / 16;

        channel.step = this.cpuFrequency * (((value >> 8) & 0x7) / 64);
    }

    /**
     * 
     * @param channel 
     * @param cycles 
     */
    private updateEnvelope(channel: IEnvelopeChannel, cycles: number = 0): void {
        if (channel.step) {
            if (cycles >= channel.nextStep) {
                channel.volume += channel.increment;
                if (channel.volume > 1) {
                    channel.volume = 1;
                } else if (channel.volume < 0) {
                    channel.volume = 0;
                }
                channel.nextStep += channel.step;
            }

            if (this.nextEvent > channel.nextStep) {
                this.nextEvent = channel.nextStep;
            }
        }
    }

    /**
     * 
     * @param value 
     */
    appendToFifoA(value: number): void {
        var b;
        if (this.fifoA.length > 28) {
            this.fifoA = this.fifoA.slice(-28);
        }
        for (var i = 0; i < 4; ++i) {
            b = (value & 0xFF) << 24;
            value >>= 8;
            this.fifoA.push(b / 0x80000000);
        }
    }

    /**
     * 
     * @param value 
     */
    appendToFifoB(value: number): void {
        var b;
        if (this.fifoB.length > 28) {
            this.fifoB = this.fifoB.slice(-28);
        }
        for (var i = 0; i < 4; ++i) {
            b = (value & 0xFF) << 24;
            value >>= 8;
            this.fifoB.push(b / 0x80000000);
        }
    }

    /**
     * 
     */
    sampleFifoA(): void {
        if (this.fifoA.length <= 16) {
            const dma = this.getIRQ().dma[this.dmaA];
            dma.nextCount = 4;
            this.getMMU().serviceDma(this.dmaA as DMANumber, dma);
        }
        this.fifoASample = this.fifoA.shift() || 0;
    }

    sampleFifoB(): void {
        if (this.fifoB.length <= 16) {
            const dma = this.getIRQ().dma[this.dmaB];
            dma.nextCount = 4;
            this.getMMU().serviceDma(this.dmaB as DMANumber, dma);
        }
        this.fifoBSample = this.fifoB.shift() ?? 0;
    }

    private getLog(): ILog {
        return this.core as ILog;
    }

    private getGBAContext(): IContext {
        return this.core as IContext;
    }

    private getMMU(): IGBAMMU {
        return this.getGBAContext().getMMU() as IGBAMMU;
    }

    private getIRQ(): IIRQ {
        return this.getGBAContext().getIRQ() as IIRQ;
    }

    private getIIO(): IIO {
        return this.getIRQ().io as IIO;
    }

    /**
     * 
     * @param number 
     * @param info 
     */
    scheduleFIFODma(number: number, info: { dest: number, dstControl: number }): void {

        const mmu = this.getMMU();
        const io = this.getIIO();

        switch (info.dest) {
            case mmu.BASE_IO | io.FIFO_A_LO:
                // FIXME: is this needed or a hack?
                info.dstControl = 2;
                this.dmaA = number;
                break;
            case mmu.BASE_IO | io.FIFO_B_LO:
                info.dstControl = 2;
                this.dmaB = number;
                break;
            default:
                this.getLog().WARN('Tried to schedule FIFO DMA for non-FIFO destination');
                break;
        }
    }

    /**
     * 
     */
    sample(): void {
        var sampleLeft = 0;
        var sampleRight = 0;
        var sample;
        var channel;

        channel = this.squareChannels[0];
        if (channel.playing) {
            sample = channel.sample * this.soundRatio * this.PSG_MAX;
            if (this.enabledLeft & 0x1) {
                sampleLeft += sample;
            }
            if (this.enabledRight & 0x1) {
                sampleRight += sample;
            }
        }

        channel = this.squareChannels[1];
        if (channel.playing) {
            sample = channel.sample * this.soundRatio * this.PSG_MAX;
            if (this.enabledLeft & 0x2) {
                sampleLeft += sample;
            }
            if (this.enabledRight & 0x2) {
                sampleRight += sample;
            }
        }

        if (this.playingChannel3) {
            sample = this.channel3Sample * this.soundRatio * this.channel3Volume * this.PSG_MAX;
            if (this.enabledLeft & 0x4) {
                sampleLeft += sample;
            }
            if (this.enabledRight & 0x4) {
                sampleRight += sample;
            }
        }

        if (this.playingChannel4) {
            sample = this.getChannel4().sample * this.soundRatio * this.PSG_MAX;
            if (this.enabledLeft & 0x8) {
                sampleLeft += sample;
            }
            if (this.enabledRight & 0x8) {
                sampleRight += sample;
            }
        }

        if (this.enableChannelA) {
            sample = this.fifoASample * this.FIFO_MAX * this.ratioChannelA;
            if (this.enableLeftChannelA) {
                sampleLeft += sample;
            }
            if (this.enableRightChannelA) {
                sampleRight += sample;
            }
        }

        if (this.enableChannelB) {
            sample = this.fifoBSample * this.FIFO_MAX * this.ratioChannelB;
            if (this.enableLeftChannelB) {
                sampleLeft += sample;
            }
            if (this.enableRightChannelB) {
                sampleRight += sample;
            }
        }

        const samplePointer = this.samplePointer;
        sampleLeft *= this.masterVolume / this.SOUND_MAX;
        sampleLeft = Math.max(Math.min(sampleLeft, 1), -1);
        sampleRight *= this.masterVolume / this.SOUND_MAX;
        sampleRight = Math.max(Math.min(sampleRight, 1), -1);
        if (this.buffers) {
            this.buffers[0][samplePointer] = sampleLeft;
            this.buffers[1][samplePointer] = sampleRight;
        }
        this.samplePointer = (samplePointer + 1) & this.sampleMask;
    }

    audioProcess(audioProcessingEvent: IAudioProcessingEvent): void {
        const left = audioProcessingEvent.outputBuffer.getChannelData(0);
        const right = audioProcessingEvent.outputBuffer.getChannelData(1);
        if (this.masterEnable) {
            var i;
            var o = this.outputPointer;
            for (i = 0; i < this.bufferSize; ++i, o += this.resampleRatio) {
                if (o >= this.maxSamples) {
                    o -= this.maxSamples;
                }
                if ((o | 0) == this.samplePointer) {
                    ++this.backup;
                    break;
                }
                left[i] = this.buffers[0][o | 0];
                right[i] = this.buffers[1][o | 0];
            }
            for (; i < this.bufferSize; ++i) {
                left[i] = 0;
                right[i] = 0;
            }
            this.outputPointer = o;
            ++this.totalSamples;
        } else {
            for (i = 0; i < this.bufferSize; ++i) {
                left[i] = 0;
                right[i] = 0;
            }
        }
    }
}