import { IVideo, IClose, IVideoCanvas, ICloseData, IClear, IRenderPath, ICPU, DrawCallbackHandler, BlankCallbackHandler, IIRQ, IPixelData } from "../interfaces.ts";
import { factoryVideoRenderer } from "./utils.ts";

export default class GameBoyAdvanceVideo implements IVideo, IClose, IClear {
    CYCLES_PER_PIXEL = 4;

    HORIZONTAL_PIXELS = 240;
    HBLANK_PIXELS = 68;
    HDRAW_LENGTH = 1006;
    HBLANK_LENGTH = 226;
    HORIZONTAL_LENGTH = 1232;

    VERTICAL_PIXELS = 160;
    VBLANK_PIXELS = 68;
    VERTICAL_TOTAL_PIXELS = 228;

    TOTAL_LENGTH = 280896;
    renderPath: IRenderPath | IClose

    DISPSTAT_MASK: number = 0
    inHblank: boolean = false
    inVblank: boolean = false
    vcounter: number = 0
    vblankIRQ: number = 0
    hblankIRQ: number = 0
    vcounterIRQ: number = 0
    vcountSetting: number = 0
    context: IVideoCanvas | null = null

    vcount: number = 0
    lastHblank: number = 0
    nextHblank: number = 0
    nextEvent: number = 0
    nextHblankIRQ: number = 0
    nextVblankIRQ: number = 0
    nextVcounterIRQ: number = 0
    // @ts-ignore
    cpu: ICPU
    drawCallback: DrawCallbackHandler
    vblankCallback: BlankCallbackHandler

    constructor() {
        this.renderPath = factoryVideoRenderer();
        this.drawCallback = function () { };
        this.vblankCallback = function () { };
    }

    clear(): void {
        this.getRenderPath().clear(this.cpu.mmu);

        // DISPSTAT
        this.DISPSTAT_MASK = 0xFF38;
        this.inHblank = false;
        this.inVblank = false;
        this.vcounter = 0;
        this.vblankIRQ = 0;
        this.hblankIRQ = 0;
        this.vcounterIRQ = 0;
        this.vcountSetting = 0;

        // VCOUNT
        this.vcount = -1;

        this.lastHblank = 0;
        this.nextHblank = this.HDRAW_LENGTH;
        this.nextEvent = this.nextHblank;

        this.nextHblankIRQ = 0;
        this.nextVblankIRQ = 0;
        this.nextVcounterIRQ = 0;
    }

    freeze(): ICloseData {
        return {
            'inHblank': this.inHblank,
            'inVblank': this.inVblank,
            'vcounter': this.vcounter,
            'vblankIRQ': this.vblankIRQ,
            'hblankIRQ': this.hblankIRQ,
            'vcounterIRQ': this.vcounterIRQ,
            'vcountSetting': this.vcountSetting,
            'vcount': this.vcount,
            'lastHblank': this.lastHblank,
            'nextHblank': this.nextHblank,
            'nextEvent': this.nextEvent,
            'nextHblankIRQ': this.nextHblankIRQ,
            'nextVblankIRQ': this.nextVblankIRQ,
            'nextVcounterIRQ': this.nextVcounterIRQ,
            'renderPath': this.getClose().freeze()
        };
    }

    defrost(frost: ICloseData): void {
        this.inHblank = frost.inHblank;
        this.inVblank = frost.inVblank;
        this.vcounter = frost.vcounter;
        this.vblankIRQ = frost.vblankIRQ;
        this.hblankIRQ = frost.hblankIRQ;
        this.vcounterIRQ = frost.vcounterIRQ;
        this.vcountSetting = frost.vcountSetting;
        this.vcount = frost.vcount;
        this.lastHblank = frost.lastHblank;
        this.nextHblank = frost.nextHblank;
        this.nextEvent = frost.nextEvent;
        this.nextHblankIRQ = frost.nextHblankIRQ;
        this.nextVblankIRQ = frost.nextVblankIRQ;
        this.nextVcounterIRQ = frost.nextVcounterIRQ;
        this.getClose().defrost(frost.renderPath);
    }

    private getClose(): IClose {
        return this.renderPath as IClose;
    }

    setBacking(backing: IVideoCanvas): void {
        const pixelData = backing.createImageData(this.HORIZONTAL_PIXELS, this.VERTICAL_PIXELS);
        this.context = backing;

        // Clear backing first
        for (var offset = 0; offset < this.HORIZONTAL_PIXELS * this.VERTICAL_PIXELS * 4;) {
            pixelData.data[offset++] = 0xFF;
            pixelData.data[offset++] = 0xFF;
            pixelData.data[offset++] = 0xFF;
            pixelData.data[offset++] = 0xFF;
        }

        this.getRenderPath().setBacking(pixelData);
    }

    private getIRQ(): IIRQ {
        return this.cpu.irq as IIRQ;
    }

    private getRenderPath(): IRenderPath {
        return this.renderPath as IRenderPath;
    }

    updateTimers(cpu: ICPU): void {
        const cycles = cpu.cycles;

        if (this.nextEvent <= cycles) {
            const irq = this.getIRQ();
            const renderPath = this.getRenderPath();
            if (this.inHblank) {
                // End Hblank
                this.inHblank = false;
                this.nextEvent = this.nextHblank;

                ++this.vcount;

                switch (this.vcount) {
                    case this.VERTICAL_PIXELS:
                        this.inVblank = true;
                        renderPath.finishDraw(this);
                        this.nextVblankIRQ = this.nextEvent + this.TOTAL_LENGTH;
                        this.cpu.mmu.runVblankDmas();
                        if (this.vblankIRQ) {
                            irq.raiseIRQ(irq.IRQ_VBLANK);
                        }
                        this.vblankCallback();
                        break;
                    case this.VERTICAL_TOTAL_PIXELS - 1:
                        this.inVblank = false;
                        break;
                    case this.VERTICAL_TOTAL_PIXELS:
                        this.vcount = 0;
                        renderPath.startDraw();
                        break;
                }

                this.vcounter = (this.vcount == this.vcountSetting) ? 1 : 0;
                if (this.vcounter && this.vcounterIRQ) {
                    irq.raiseIRQ(irq.IRQ_VCOUNTER);
                    this.nextVcounterIRQ += this.TOTAL_LENGTH;
                }

                if (this.vcount < this.VERTICAL_PIXELS) {
                    renderPath.drawScanline(this.vcount);
                }
            } else {
                // Begin Hblank
                this.inHblank = true;
                this.lastHblank = this.nextHblank;
                this.nextEvent = this.lastHblank + this.HBLANK_LENGTH;
                this.nextHblank = this.nextEvent + this.HDRAW_LENGTH;
                this.nextHblankIRQ = this.nextHblank;

                if (this.vcount < this.VERTICAL_PIXELS) {
                    this.cpu.mmu.runHblankDmas();
                }
                if (this.hblankIRQ) {
                    irq.raiseIRQ(irq.IRQ_HBLANK);
                }
            }
        }
    }

    writeDisplayStat(value: number): void {
        this.vblankIRQ = value & 0x0008;
        this.hblankIRQ = value & 0x0010;
        this.vcounterIRQ = value & 0x0020;
        this.vcountSetting = (value & 0xFF00) >> 8;

        if (this.vcounterIRQ) {
            // FIXME: this can be too late if we're in the middle of an Hblank
            this.nextVcounterIRQ = this.nextHblank + this.HBLANK_LENGTH + (this.vcountSetting - this.vcount) * this.HORIZONTAL_LENGTH;
            if (this.nextVcounterIRQ < this.nextEvent) {
                this.nextVcounterIRQ += this.TOTAL_LENGTH;
            }
        }
    }

    readDisplayStat(): number {
        return (this.inVblank ? 1 : 0) | ((this.inHblank ? 1 : 0) << 1) | (this.vcounter << 2);
    }

    finishDraw(pixelData: IPixelData): void {
        this.getVideoCanvas().putImageData(pixelData, 0, 0);
        this.drawCallback();
    }

    private getVideoCanvas(): IVideoCanvas {
        if (!this.context) {
            throw new Error("video canvas no init");
        }

        return this.context;
    }
}
