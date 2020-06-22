import {ISave, IGBA, IClose, IGBAMMU, ICart, IFrost, ILogger, ILog, IAssert, ICPU, IClear, IContext} from "./interfaces.ts";
import GameBoyAdvanceMMU from "./mmu/GameBoyAdvanceMMU.ts";
import ARMCore from "./core/ARMCore.ts";

class GameBoyAdvance implements IGBA, IClose, IContext, ILog, IAssert {
    mmu: IGBAMMU | IClose | IClear
    rom: ICart|null
    cpu: IClose|ICPU
    log: ILogger|null = null

    static LOG_ERROR = 1
    static LOG_WARN = 2
    static LOG_STUB = 4
    static LOG_INFO = 8
    static LOG_DEBUG = 16
    readonly SYS_ID = 'com.endrift.gbajs'

    logLevel: number
    doStep: ()=>boolean
    seenFrame: boolean
    paused: boolean

    constructor() {   
        this.logLevel = GameBoyAdvance.LOG_ERROR | GameBoyAdvance.LOG_WARN;
    
        this.rom = null;
    
        this.cpu = new ARMCore();
        this.mmu = new GameBoyAdvanceMMU()
        this.irq = new GameBoyAdvanceInterruptHandler();
        this.io = new GameBoyAdvanceIO();
        this.audio = new GameBoyAdvanceAudio();
        this.video = new GameBoyAdvanceVideo();
        this.keypad = new GameBoyAdvanceKeypad();
        this.sio = new GameBoyAdvanceSIO();
    
        // TODO: simplify this graph
        this.cpu.mmu = this.mmu;
        this.cpu.irq = this.irq;
    
        this.mmu.cpu = this.cpu;
        this.mmu.core = this;
    
        this.irq.cpu = this.cpu;
        this.irq.io = this.io;
        this.irq.audio = this.audio;
        this.irq.video = this.video;
        this.irq.core = this;
    
        this.io.cpu = this.cpu;
        this.io.audio = this.audio;
        this.io.video = this.video;
        this.io.keypad = this.keypad;
        this.io.sio = this.sio;
        this.io.core = this;
    
        this.audio.cpu = this.cpu;
        this.audio.core = this;
    
        this.video.cpu = this.cpu;
        this.video.core = this;
    
        this.keypad.core = this;
    
        this.sio.core = this;
    
        this.keypad.registerHandlers();
        this.doStep = this.waitFrame;
        this.paused = false;
    
        this.seenFrame = false;
        this.seenSave = false;
        this.lastVblank = 0;
    
        this.queue = null;
        this.reportFPS = null;
        this.throttle = 16; // This is rough, but the 2/3ms difference gives us a good overhead
    
        const self = this;
        // @ts-ignore
        window.queueFrame (f) {
            self.queue = window.setTimeout(f, self.throttle);
        };
    
        // @ts-ignore
        window.URL = window.URL || window.webkitURL;
    
        this.video.vblankCallback() {
            self.seenFrame = true;
        };
    }
    
    /**
     * 
     * @param canvas 
     */
    setCanvas(canvas: unknown):void {
        var self = this;
        if (canvas.offsetWidth != 240 || canvas.offsetHeight != 160) {
            this.indirectCanvas = document.createElement("canvas");
            this.indirectCanvas.setAttribute("height", "160");
            this.indirectCanvas.setAttribute("width", "240");
            this.targetCanvas = canvas;
            this.setCanvasDirect(this.indirectCanvas);
            var targetContext = canvas.getContext('2d');
            this.video.drawCallback() {
                targetContext.drawImage(self.indirectCanvas, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
            }
        } else {
            this.setCanvasDirect(canvas);
            var self = this;
        }
    }
    
    /**
     * 
     * @param canvas 
     */
    setCanvasDirect(canvas: unknown):void {
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
    setBios(bios: ArrayBuffer, real: boolean = false):void {
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
    loadRomFromFile(romFile: unknown, callback: (result: boolean)=>void) {
        // @ts-ignore
        const reader = new FileReader();
        const self = this;
        // @ts-ignore
        reader.onload(e) {
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
    reset():void {
        this.audio.pause(true);
    
        (this.mmu as IClear).clear();
        this.io.clear();
        this.audio.clear();
        this.video.clear();
        this.sio.clear();
    
        const gbammu = this.getGBAMMU();
        gbammu.mmap(gbammu.REGION_IO, this.io);
        gbammu.mmap(gbammu.REGION_PALETTE_RAM, this.video.renderPath.palette);
        gbammu.mmap(gbammu.REGION_VRAM, this.video.renderPath.vram);
        gbammu.mmap(gbammu.REGION_OAM, this.video.renderPath.oam);
    
        (this.cpu as ICPU).resetCPU(0);
    }
    
    /**
     * 
     */
    step():void {
        while (this.doStep()) {
            (this.cpu as ICPU).step();
        }
    }
    
    /**
     * 
     */
    waitFrame():boolean {
        const seen = this.seenFrame;
        this.seenFrame = false;
        return !seen;
    }
    
    /**
     * 
     */
    pause():void {
        this.paused = true;
        this.audio.pause(true);
        if (this.queue) {
            clearTimeout(this.queue);
            this.queue = null;
        }
    }
    
    /**
     * 
     */
    advanceFrame(): void {
        this.step();
        if (this.seenSave) {
            if (!this.mmu.saveNeedsFlush()) {
                this.storeSavedata();
                this.seenSave = false;
            } else {
                this.mmu.flushSave();
            }
        } else if (this.mmu.saveNeedsFlush()) {
            this.seenSave = true;
            this.mmu.flushSave();
        }
    }
    
    /**
     * 
     */
    runStable(): void {
        if (this.interval) {
            return; // Already running
        }
        var self = this;
        var timer = 0;
        var frames = 0;
        var runFunc;
        var start = Date.now();
        this.paused = false;
        this.audio.pause(false);
    
        if (this.reportFPS) {
            runFunc() {
                try {
                    timer += Date.now() - start;
                    if (self.paused) {
                        return;
                    } else {
                        queueFrame(runFunc);
                    }
                    start = Date.now();
                    self.advanceFrame();
                    ++frames;
                    if (frames == 60) {
                        self.reportFPS((frames * 1000) / timer);
                        frames = 0;
                        timer = 0;
                    }
                } catch(exception) {
                    self.ERROR(exception);
                    if (exception.stack) {
                        self.logStackTrace(exception.stack.split('\n'));
                    }
                    throw exception;
                }
            };
        } else {
            runFunc() {
                try {
                    if (self.paused) {
                        return;
                    } else {
                        queueFrame(runFunc);
                    }
                    self.advanceFrame();
                } catch(exception) {
                    self.ERROR(exception);
                    if (exception.stack) {
                        self.logStackTrace(exception.stack.split('\n'));
                    }
                    throw exception;
                }
            };
        }
        queueFrame(runFunc);
    }
    
    /**
     * 載入遊戲進度
     * @param data 
     */
    setSavedata(data: ArrayBuffer): void {
        this.mmu.loadSavedata(data);
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
        reader.onload(e) { 
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

        if(!bits){
            throw new Error("data invalid");
        }

        let i;
        for (i = 0; i + 2 < length; i += 3) {
            const item = bits.shift();
            if(!item){
                throw new Error("data invalid");
            }
            const s = atob(item);
            view[i] = s.charCodeAt(0);
            view[i + 1] = s.charCodeAt(1);
            view[i + 2] = s.charCodeAt(2);
        }

        if (i < length) {
            const item = bits.shift();
            if(!item){
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
    encodeBase64(view: DataView):string {
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
    downloadSavedata():boolean {
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
            'irq': this.irq.freeze(),
            'io': this.io.freeze(),
            'audio': this.audio.freeze(),
            'video': this.video.freeze()
        }
    }
    
    /**
     * 
     * @param frost 
     */
    defrost(frost: IFrost): void {
        (this.cpu as IClose).defrost(frost.cpu);
        (this.mmu as IClose).defrost(frost.mmu);
        this.audio.defrost(frost.audio);
        this.video.defrost(frost.video);
        this.irq.defrost(frost.irq);
        this.io.defrost(frost.io);
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
    logStackTrace(stack:Array<unknown>):void {
        if(!this.log){
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
        if(!this.log){
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
    WARN(warn: string):void {
        if(!this.log){
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
        if(!this.log){
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
        if(!this.log){
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
        if(!this.log){
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