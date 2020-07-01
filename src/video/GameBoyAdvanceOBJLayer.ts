import { IBacking, IVideoObject, IRenderPath, IOAM, IVideoObjectLayer } from "../interfaces.ts";

export default class GameBoyAdvanceOBJLayer implements IVideoObjectLayer{

    bg: boolean
    index: number
    priority: number
    enabled: boolean
    objwin: number
    video: IRenderPath

    constructor(video: IRenderPath, index: number) {
        this.video = video;
        this.bg = false;
        this.index = video.LAYER_OBJ;
        this.priority = index;
        this.enabled = false;
        this.objwin = 0;
    }

    private getOAM(): IOAM {
        if (!this.video.oam) {
            throw new Error('oam no init');
        }
        return this.video.oam;
    }

    /**
     * 
     * @param backing 
     * @param layer 
     * @param start 
     * @param end 
     */
    drawScanline(backing: IBacking, layer: number, start: number, end: number): void {
        if (start >= end) {
            return;
        }

        const y = this.video.vcount;
        const objs = this.getOAM().objs;
        for (var i = 0; i < objs.length; ++i) {
            const obj = objs[i];
            if (obj.disable) {
                continue;
            }
            if ((obj.mode & this.video.OBJWIN_MASK) != this.objwin) {
                continue;
            }
            if (!(obj.mode & this.video.OBJWIN_MASK) && this.priority != obj.priority) {
                continue;
            }
            let wrappedY: number;
            if (obj.y < this.video.VERTICAL_PIXELS) {
                wrappedY = obj.y;
            } else {
                wrappedY = obj.y - 256;
            }
            let totalHeight;
            if (!obj.scalerot) {
                totalHeight = obj.cachedHeight;
            } else {
                totalHeight = obj.cachedHeight << obj.doublesize;
            }

            let mosaicY: number;
            if (!obj.mosaic) {
                mosaicY = y;
            } else {
                mosaicY = y - y % this.video.objMosaicY;
            }
            if (wrappedY <= y && (wrappedY + totalHeight) > y) {
                obj.drawScanline(backing, mosaicY, wrappedY, start, end);
            }
        }
    }

    objComparator(a: IVideoObject, b: IVideoObject) {
        return a.index - b.index;
    }

}