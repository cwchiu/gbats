import { MMURegion, IVideo, ICanvasHtmlElement, IAudio, IKeypad, ISIO, IIO, IIRQ, IGBA, IClose, IGBAMMU, ICart, IFrost, ILogger, ILog, IAssert, ICPU, IClear, IContext, IRenderPath, IMemoryView } from "./interfaces.ts";
import { factoryIO, factorySIO } from "./gpio/mod.ts";
import { factoryAudio } from "./audio/mod.ts";
import { factoryVideo } from "./video/mod.ts";
import { factoryKeypad } from "./keypad/mod.ts";
import { factoryIRQ } from "./irq/mod.ts";
import { factoryMMU } from "./mmu/mod.ts";
import { factoryCPU } from "./core/mod.ts";

interface Arg1Func {
    (value:number): void
}

class GameBoyAdvance implements IGBA, IClose, IContext, ILog, IAssert {
    indirectCanvas: ICanvasHtmlElement | null = null
    targetCanvas: ICanvasHtmlElement | null = null
    private queue: number = 0
    reportFPS: null | Arg1Func = null
    rom: ICart | null
    log: ILogger | null = null
    static LOG_ERROR = 1
    static LOG_WARN = 2
    static LOG_STUB = 4
    static LOG_INFO = 8
    static LOG_DEBUG = 16
    readonly SYS_ID = 'com.endrift.gbajs'

    logLevel: number
    doStep: () => boolean
    seenFrame: boolean
    paused: boolean
    private mmu: IGBAMMU | IClose | IClear
    private cpu: IClose | ICPU
    private irq: IIRQ | IClose
    private io: IIO | IClose | IClear
    private sio: ISIO | IClear
    private audio: IAudio | IClose | IClear
    private video: IVideo | IClose | IClear
    private keypad: IKeypad
    throttle: number = 0
    lastVblank: number = 0
    seenSave: boolean = false

    constructor() {
        this.logLevel = GameBoyAdvance.LOG_ERROR | GameBoyAdvance.LOG_WARN;

        this.rom = null;
        this.cpu = factoryCPU();
        this.mmu = factoryMMU(this);
        this.irq = factoryIRQ();
        this.io = factoryIO();
        this.audio = factoryAudio();
        this.video = factoryVideo();
        this.keypad = factoryKeypad();
        this.sio = factorySIO();

        // TODO: simplify this graph
        // this.cpu.mmu = this.mmu;
        // this.cpu.irq = this.irq;

        // this.mmu.cpu = this.cpu;
        // this.mmu.core = this;

        // this.irq.cpu = this.cpu;
        // this.irq.io = this.io;
        // this.irq.audio = this.audio;
        // this.irq.video = this.video;
        // this.irq.core = this;

        // this.io.cpu = this.cpu;
        // this.io.audio = this.audio;
        // this.io.video = this.video;
        // this.io.keypad = this.keypad;
        // this.io.sio = this.sio;
        // this.io.core = this;

        // this.audio.cpu = this.cpu;
        // this.audio.core = this;
        // 
        // this.video.cpu = this.cpu;
        // this.video.core = this;
        // 
        // this.keypad.core = this;
        // 
        // this.sio.core = this;

        this.keypad.registerHandlers();
        this.doStep = this.waitFrame;
        this.paused = false;

        this.seenFrame = false;
        this.seenSave = false;
        this.lastVblank = 0;

        this.queue = 0;
        this.reportFPS = null;
        this.throttle = 16; // This is rough, but the 2/3ms difference gives us a good overhead

        const self = this;
        // @ts-ignore
        window.queueFrame = function (f) {
            // @ts-ignore
            self.queue = window.setTimeout(f, self.throttle);
        };

        // @ts-ignore
        window.URL = window.URL || window.webkitURL;

        (this.video as IVideo).vblankCallback = function () {
            self.seenFrame = true;
        };
    }

    getLog():ILog {
        return this as ILog;
    }

    getGBA():IGBA {
        return this as IGBA;
    }
    
    getContext():IContext {
        return this as IContext;
    }

    getIO(): IIO | IClose | IClear {
        return this.io;
    }

    getVideo(): IVideo | IClose | IClear {
        return this.video;
    }

    getAudio(): IAudio | IClose | IClear {
        return this.audio;
    }

    getIRQ(): IIRQ | IClose | IClear {
        return this.irq;
    }

    getCPU(): ICPU | IClose | IClear {
        return this.cpu;
    }

    getMMU(): IGBAMMU | IClose | IClear {
        return this.mmu;
    }

    /**
     * 
     * @param canvas 
     */
    setCanvas(canvas: ICanvasHtmlElement): void {
        const self = this;

        if (canvas.offsetWidth != 240 || canvas.offsetHeight != 160) {
            // @ts-ignore
            this.indirectCanvas = document.createElement("canvas");
            if(!this.indirectCanvas){
                throw new Error("create canvas error");
            }
            this.indirectCanvas.setAttribute("height", "160");
            this.indirectCanvas.setAttribute("width", "240");
            this.targetCanvas = canvas;
            this.setCanvasDirect(this.indirectCanvas);
            // @ts-ignore
            const targetContext = canvas.getContext('2d');
            (this.video as IVideo).drawCallback = function () {
                // @ts-ignore
                targetContext.drawImage(self.indirectCanvas, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
            }
        } else {
            this.setCanvasDirect(canvas);
        }
    }

    /**
     * 
     * @param canvas 
     */
    setCanvasDirect(canvas: unknown): void {
        // @ts-ignore
        this.context = canvas.getContext('2d');
        // @ts-ignore
        this.video.setBacking(this.context);
    }

    private getGBAMMU(): IGBAMMU {
        return this.mmu as IGBAMMU;
    }

    /**
     * 
     * @param bios 
     * @param real 
     */
    setBios(bios: ArrayBuffer, real: boolean = false): void {
        this.getGBAMMU().loadBios(bios, real);
    }

    /**
     * 
     * @param rom 
     */
    setRom(rom: ArrayBuffer): boolean {
        this.reset();

        this.rom = this.getGBAMMU().loadRom(rom, true);
        if (!this.rom) {
            return false;
        }
        this.retrieveSavedata();
        return true;
    }

    /**
     * 
     */
    hasRom(): boolean {
        return !!this.rom;
    }

    /**
     * 
     * @param romFile 
     * @param callback 
     */
    loadRomFromFile(romFile: unknown, callback: (result: boolean) => void) {
        // @ts-ignore
        const reader = new FileReader();
        const self = this;
        // @ts-ignore
        reader.onload = function(e) {
            // @ts-ignore
            var result = self.setRom(e.target.result);
            if (callback) {
                callback(result);
            }
        }
        reader.readAsArrayBuffer(romFile);
    }

    /**
     * 
     */
    reset(): void {
        (this.audio as IAudio).pause(true);

        (this.mmu as IClear).clear();
        (this.io as IClear).clear();
        (this.audio as IClear).clear();
        (this.video as IClear).clear();
        (this.sio as IClear).clear();

        const gbammu = this.getGBAMMU();
        gbammu.mmap(MMURegion.REGION_IO, (this.io as IIO).getMemoryView() );
        const render = (this.video as IVideo).renderPath as IRenderPath;
        gbammu.mmap(MMURegion.REGION_PALETTE_RAM, render.palette!.getMemoryView());
        gbammu.mmap(MMURegion.REGION_VRAM, render.vram!.getMemoryView());
        gbammu.mmap(MMURegion.REGION_OAM, render.oam!.getMemoryView());

        (this.cpu as ICPU).resetCPU(0);
    }

    /**
     * 
     */
    step(): void {
        while (this.doStep()) {
            (this.cpu as ICPU).step();
        }
    }

    /**
     * 
     */
    waitFrame(): boolean {
        const seen = this.seenFrame;
        this.seenFrame = false;
        return !seen;
    }

    /**
     * 
     */
    pause(): void {
        this.paused = true;
        (this.audio as IAudio).pause(true);
        if (this.queue > 0) {
            clearTimeout(this.queue);
            this.queue = 0;
        }
    }

    /**
     * 
     */
    advanceFrame(): void {
        this.step();
        const mmu = this.mmu as IGBAMMU;
        if (this.seenSave) {
            if (!mmu.saveNeedsFlush()) {
                this.storeSavedata();
                this.seenSave = false;
            } else {
                mmu.flushSave();
            }
        } else if (mmu.saveNeedsFlush()) {
            this.seenSave = true;
            mmu.flushSave();
        }
    }

    /**
     * 
     */
    runStable(): void {
        // if (this.interval) {
            // return; // Already running
        // }
        var self = this;
        var timer = 0;
        var frames = 0;
        let runFunc: () => void;
        var start = Date.now();
        this.paused = false;
        (this.audio as IAudio).pause(false);

        if (this.reportFPS) {
            runFunc = function () {
                try {
                    timer += Date.now() - start;
                    if (self.paused) {
                        return;
                    } else {
                        // @ts-ignore
                        queueFrame(runFunc);
                    }
                    start = Date.now();
                    self.advanceFrame();
                    ++frames;
                    if (frames == 60) {
                        self.reportFPS!((frames * 1000) / timer);
                        frames = 0;
                        timer = 0;
                    }
                } catch (exception) {
                    self.ERROR(exception);
                    if (exception.stack) {
                        self.logStackTrace(exception.stack.split('\n'));
                    }
                    throw exception;
                }
            };
        } else {
            runFunc = function () {
                try {
                    if (self.paused) {
                        return;
                    } else {
                        // @ts-ignore
                        queueFrame(runFunc);
                    }
                    self.advanceFrame();
                } catch (exception) {
                    self.ERROR(exception);
                    if (exception.stack) {
                        self.logStackTrace(exception.stack.split('\n'));
                    }
                    throw exception;
                }
            };
        }
        // @ts-ignore
        queueFrame(runFunc);
    }

    /**
     * 載入遊戲進度
     * @param data 
     */
    setSavedata(data: ArrayBuffer): void {
        (this.mmu as IGBAMMU).loadSavedata(data);
    }

    /**
     * 載入遊戲進度
     * @param saveFile 
     */
    loadSavedataFromFile(saveFile: unknown) {
        // @ts-ignore
        const reader = new FileReader();
        const self = this;

        // @ts-ignore
        reader.onload = function (e) {
            // @ts-ignore
            self.setSavedata(e.target.result);
        };
        reader.readAsArrayBuffer(saveFile);
    }

    /**
     * 解碼狀態資料
     * @param string 
     */
    decodeSavedata(string: string): void {
        this.setSavedata(this.decodeBase64(string));
    }

    /**
     * Base64 Decode
     * @param string 
     */
    decodeBase64(string: string): ArrayBuffer {
        let length = (string.length * 3 / 4);
        if (string[string.length - 2] == '=') {
            length -= 2;
        } else if (string[string.length - 1] == '=') {
            length -= 1;
        }
        const buffer = new ArrayBuffer(length);
        let view = new Uint8Array(buffer);
        const bits = string.match(/..../g);

        if (!bits) {
            throw new Error("data invalid");
        }

        let i;
        for (i = 0; i + 2 < length; i += 3) {
            const item = bits.shift();
            if (!item) {
                throw new Error("data invalid");
            }
            const s = atob(item);
            view[i] = s.charCodeAt(0);
            view[i + 1] = s.charCodeAt(1);
            view[i + 2] = s.charCodeAt(2);
        }

        if (i < length) {
            const item = bits.shift();
            if (!item) {
                throw new Error("data invalid");
            }
            const s = atob(item);
            view[i++] = s.charCodeAt(0);
            if (s.length > 1) {
                view[i++] = s.charCodeAt(1);
            }
        }

        return buffer;
    }

    /**
     * Base64 Encode
     * @param view 
     */
    encodeBase64(view: DataView): string {
        const data = [];
        const wordstring = [];
        for (let i = 0; i < view.byteLength; ++i) {
            const b = view.getUint8(i);
            wordstring.push(String.fromCharCode(b));
            while (wordstring.length >= 3) {
                const triplet = wordstring.splice(0, 3);
                data.push(btoa(triplet.join('')));
            }
        }

        if (wordstring.length) {
            data.push(btoa(wordstring.join('')));
        }
        return data.join('');
    }

    /**
     * 下載遊戲進度
     */
    downloadSavedata(): boolean {
        const sram = (this.mmu as IGBAMMU).save;
        if (!sram) {
            this.WARN("No save data available");
            return false;
        }

        // @ts-ignore
        if (window.URL) {
            // @ts-ignore
            const url = window.URL.createObjectURL(new Blob([sram.buffer], { type: 'application/octet-stream' }));
            // @ts-ignore
            window.open(url);
        } else {
            const data = this.encodeBase64(sram.view);
            // @ts-ignore
            window.open('data:application/octet-stream;base64,' + data, this.rom.code + '.sav');
        }

        return true;
    }

    /**
     * 儲存遊戲進度
     */
    storeSavedata(): void {
        const gbammu = (this.mmu as IGBAMMU);
        const sram = gbammu.save;
        if (!sram) {
            throw new Error("GBA SRAM no init");
        }

        if (!gbammu.cart) {
            throw new Error("GBA MMU cart no init");
        }

        try {
            // @ts-ignore
            const storage = window.localStorage;
            storage[this.SYS_ID + '.' + gbammu.cart.code] = this.encodeBase64(sram.view);
        } catch (e) {
            this.WARN('Could not store savedata! ' + e);
        }
    }

    /**
     * 
     */
    retrieveSavedata(): boolean {
        const gbammu = (this.mmu as IGBAMMU);
        if (!gbammu.cart) {
            throw new Error("GBA MMU cart no init");
        }
        try {
            // @ts-ignore
            const storage = window.localStorage;
            const data = storage[this.SYS_ID + '.' + gbammu.cart.code];
            if (data) {
                this.decodeSavedata(data);
                return true;
            }
        } catch (e) {
            this.WARN('Could not retrieve savedata! ' + e);
        }
        return false;
    }

    /**
     * 
     */
    freeze(): IFrost {
        return {
            'cpu': (this.cpu as IClose).freeze(),
            'mmu': (this.mmu as IClose).freeze(),
            'irq': (this.irq as IClose).freeze(),
            'io': (this.io as IClose).freeze(),
            'audio': (this.audio as IClose).freeze(),
            'video': (this.video as IClose).freeze()
        }
    }

    /**
     * 
     * @param frost 
     */
    defrost(frost: IFrost): void {
        (this.cpu as IClose).defrost(frost.cpu);
        (this.mmu as IClose).defrost(frost.mmu);
        (this.audio as IClose).defrost(frost.audio);
        (this.video as IClose).defrost(frost.video);
        (this.irq as IClose).defrost(frost.irq);
        (this.io as IClose).defrost(frost.io);
    }

    /**
     * 
     * @param logger 
     */
    setLogger(logger: ILogger) {
        this.log = logger;
    }

    /**
     * 
     * 
     */
    logStackTrace(stack: Array<unknown>): void {
        if (!this.log) {
            return;
        }

        const overflow = stack.length - 32;
        this.ERROR('Stack trace follows:');
        if (overflow > 0) {
            this.log(-1, '> (Too many frames)');
        }
        for (var i = Math.max(overflow, 0); i < stack.length; ++i) {
            this.log(-1, '> ' + stack[i]);
        }
    }

    /**
     * 
     * @param error 
     */
    ERROR(error: string): void {
        if (!this.log) {
            return;
        }

        if (this.logLevel & GameBoyAdvance.LOG_ERROR) {
            this.log(GameBoyAdvance.LOG_ERROR, error);
        }
    }

    /**
     * 
     * @param warn 
     */
    WARN(warn: string): void {
        if (!this.log) {
            return;
        }

        if (this.logLevel & GameBoyAdvance.LOG_WARN) {
            this.log(GameBoyAdvance.LOG_WARN, warn);
        }
    }

    /**
     * 
     * @param func 
     */
    STUB(func: string): void {
        if (!this.log) {
            return;
        }

        if (this.logLevel & GameBoyAdvance.LOG_STUB) {
            this.log(GameBoyAdvance.LOG_STUB, func);
        }
    }

    /**
     * 
     * @param info 
     */
    INFO(info: string): void {
        if (!this.log) {
            return;
        }

        if (this.logLevel & GameBoyAdvance.LOG_INFO) {
            this.log(GameBoyAdvance.LOG_INFO, info);
        }
    }

    /**
     * 
     * @param info 
     */
    DEBUG(info: string): void {
        if (!this.log) {
            return;
        }

        if (this.logLevel & GameBoyAdvance.LOG_DEBUG) {
            this.log(GameBoyAdvance.LOG_DEBUG, info);
        }
    }

    /**
     * 
     * @param err 
     */
    ASSERT_UNREACHED(err: Error): never {
        throw new Error("Should be unreached: " + err);
    }

    /**
     * 
     * @param test 
     * @param err 
     */
    ASSERT(test: boolean, err: Error): void {
        if (!test) {
            throw new Error("Assertion failed: " + err);
        }
    }
}

export {
    GameBoyAdvance
};