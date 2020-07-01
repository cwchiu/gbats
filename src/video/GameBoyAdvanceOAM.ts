import MemoryAligned16 from "./MemoryAligned16.ts";
import {IScalerot, IOAM, IRenderPath, IVideoObject, IMemoryView} from "../interfaces.ts";
import {factoryVideoObject} from "./utils.ts";

export default class GameBoyAdvanceOAM extends MemoryAligned16 implements IOAM {
    oam: Uint16Array
    scalerot: IScalerot[]
    objs: IVideoObject[]
    video: IRenderPath|null = null

    constructor(size: number) {
        super(size);
        this.oam = this.buffer;
        this.objs = new Array(128);
        for (let i = 0; i < 128; ++i) {
            this.objs[i] = factoryVideoObject(this, i);
        }
        this.scalerot = new Array(32);
        for (var i = 0; i < 32; ++i) {
            this.scalerot[i] = {
                a: 1,
                b: 0,
                c: 0,
                d: 1
            };
        }
    }

    getMemoryView():IMemoryView {
        return this as IMemoryView;
    }

    /**
     * 
     * @param memory 
     */
    overwrite(memory: number[]): void {
        for (var i = 0; i < (this.buffer.byteLength >> 1); ++i) {
            this.store16(i << 1, memory[i]);
        }
    }

    store16(offset: number, value: number): void {
        var index = (offset & 0x3F8) >> 3;
        var obj = this.objs[index];
        var scalerot = this.scalerot[index >> 2];
        var layer = obj.priority;
        var disable = obj.disable;
        var y = obj.y;
        switch (offset & 0x00000006) {
            case 0:
                // Attribute 0
                obj.y = value & 0x00FF;
                var wasScalerot = obj.scalerot;
                obj.scalerot = value & 0x0100;
                if (obj.scalerot) {
                    obj.scalerotOam = this.scalerot[obj.scalerotParam];
                    obj.doublesize = !!(value & 0x0200)?1:0;
                    obj.disable = false;
                    obj.hflip = 0;
                    obj.vflip = 0;
                } else {
                    obj.doublesize = 0;
                    obj.disable = (value & 0x0200)>0;
                    if (wasScalerot) {
                        obj.hflip = obj.scalerotParam & 0x0008;
                        obj.vflip = obj.scalerotParam & 0x0010;
                    }
                }
                obj.mode = (value & 0x0C00) >> 6; // This lines up with the stencil format
                obj.mosaic = (value & 0x1000)>0;
                obj.multipalette = value & 0x2000;
                obj.shape = (value & 0xC000) >> 14;

                obj.recalcSize();
                break;
            case 2:
                // Attribute 1
                obj.x = value & 0x01FF;
                if (obj.scalerot) {
                    obj.scalerotParam = (value & 0x3E00) >> 9;
                    obj.scalerotOam = this.scalerot[obj.scalerotParam];
                    obj.hflip = 0;
                    obj.vflip = 0;
                    obj.drawScanline = obj.drawScanlineAffine;
                } else {
                    obj.hflip = value & 0x1000;
                    obj.vflip = value & 0x2000;
                    obj.drawScanline = obj.drawScanlineNormal;
                }
                obj.size = (value & 0xC000) >> 14;

                obj.recalcSize();
                break;
            case 4:
                // Attribute 2
                obj.tileBase = value & 0x03FF;
                obj.priority = (value & 0x0C00) >> 10;
                obj.palette = (value & 0xF000) >> 8; // This is shifted up 4 to make pushPixel faster
                break;
            case 6:
                // Scaling/rotation parameter
                switch (index & 0x3) {
                    case 0:
                        scalerot.a = (value << 16) / 0x1000000;
                        break;
                    case 1:
                        scalerot.b = (value << 16) / 0x1000000;
                        break;
                    case 2:
                        scalerot.c = (value << 16) / 0x1000000;
                        break;
                    case 3:
                        scalerot.d = (value << 16) / 0x1000000;
                        break;
                }
                break;
        }

        super.store16(offset, value);
    }
}    