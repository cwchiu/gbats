import {IVideoPalette, IMemoryView, ICacheData} from "../interfaces.ts";

export default class GameBoyAdvancePalette implements IVideoPalette, IMemoryView {
    buffer: Uint16Array  = new Uint16Array(0);
    icache: Array<ICacheData> = []
    view: DataView = new DataView(new ArrayBuffer(0))
    mask: number = 0

    blendY: number = 0
    colors: number[][]
    adjustedColors: number[][]
    passthroughColors: number[][]
    adjustColor: (color: number) => number

    constructor() {
        this.colors = [new Array(0x100), new Array(0x100)];
        this.adjustedColors = [new Array(0x100), new Array(0x100)];
        this.passthroughColors = [
            this.colors[0], // BG0
            this.colors[0], // BG1
            this.colors[0], // BG2
            this.colors[0], // BG3
            this.colors[1], // OBJ
            this.colors[0] // Backdrop
        ];
        this.blendY = 1;
        this.adjustColor = this.adjustColorBright;
    }

    getMemoryView():IMemoryView {
        return this as IMemoryView;
    }

    replaceData(memory: ArrayBuffer, offset: number): void {
        throw new Error("no imp");
    }

    load8(offset: number): number {
        throw new Error("no support");
    }

    store8(offset: number, value: number): void {
        throw new Error("no support");
    }

    /**
     * 
     */
    overwrite(memory: ArrayLike<number>): void {
        for (var i = 0; i < 512; ++i) {
            this.store16(i << 1, memory[i]);
        }
    }

    /**
     * 
     * @param offset 
     */
    loadU8(offset: number): number {
        return (this.loadU16(offset) >> (8 * (offset & 1))) & 0xFF;
    }

    /**
     * 
     * @param offset 
     */
    loadU16(offset: number): number {
        return this.colors[(offset & 0x200) >> 9][(offset & 0x1FF) >> 1];
    }

    load16(offset: number): number {
        return (this.loadU16(offset) << 16) >> 16;
    }

    load32(offset: number): number {
        return this.loadU16(offset) | (this.loadU16(offset + 2) << 16);
    }

    store16(offset: number, value: number): void {
        var type = (offset & 0x200) >> 9;
        var index = (offset & 0x1FF) >> 1;
        this.colors[type][index] = value;
        this.adjustedColors[type][index] = this.adjustColor(value);
    }

    store32(offset: number, value: number): void {
        this.store16(offset, value & 0xFFFF);
        this.store16(offset + 2, value >> 16);
    }

    invalidatePage(address: number) { }

    convert16To32(value: number, input: number[]): void {
        const r = (value & 0x001F) << 3;
        const g = (value & 0x03E0) >> 2;
        const b = (value & 0x7C00) >> 7;

        input[0] = r;
        input[1] = g;
        input[2] = b;
    }

    /**
     * 
     * @param aWeight 
     * @param aColor 
     * @param bWeight 
     * @param bColor 
     */
    mix(aWeight: number, aColor: number, bWeight: number, bColor: number): number {
        const ar = (aColor & 0x001F);
        const ag = (aColor & 0x03E0) >> 5;
        const ab = (aColor & 0x7C00) >> 10;

        const br = (bColor & 0x001F);
        const bg = (bColor & 0x03E0) >> 5;
        const bb = (bColor & 0x7C00) >> 10;

        const r = Math.min(aWeight * ar + bWeight * br, 0x1F);
        const g = Math.min(aWeight * ag + bWeight * bg, 0x1F);
        const b = Math.min(aWeight * ab + bWeight * bb, 0x1F);

        return r | (g << 5) | (b << 10);
    }

    makeDarkPalettes(layers: number): void {
        if (this.adjustColor != this.adjustColorDark) {
            this.adjustColor = this.adjustColorDark;
            this.resetPalettes();
        }
        this.resetPaletteLayers(layers);
    }

    makeBrightPalettes(layers: number): void {
        if (this.adjustColor != this.adjustColorBright) {
            this.adjustColor = this.adjustColorBright;
            this.resetPalettes();
        }
        this.resetPaletteLayers(layers);
    }

    makeNormalPalettes(): void {
        this.passthroughColors[0] = this.colors[0];
        this.passthroughColors[1] = this.colors[0];
        this.passthroughColors[2] = this.colors[0];
        this.passthroughColors[3] = this.colors[0];
        this.passthroughColors[4] = this.colors[1];
        this.passthroughColors[5] = this.colors[0];
    }

    makeSpecialPalette(layer: number): void {
        this.passthroughColors[layer] = this.adjustedColors[layer == 4 ? 1 : 0];
    }

    makeNormalPalette(layer: number): void {
        this.passthroughColors[layer] = this.colors[layer == 4 ? 1 : 0];
    }

    resetPaletteLayers(layers: number): void {
        if (layers & 0x01) {
            this.passthroughColors[0] = this.adjustedColors[0];
        } else {
            this.passthroughColors[0] = this.colors[0];
        }
        if (layers & 0x02) {
            this.passthroughColors[1] = this.adjustedColors[0];
        } else {
            this.passthroughColors[1] = this.colors[0];
        }
        if (layers & 0x04) {
            this.passthroughColors[2] = this.adjustedColors[0];
        } else {
            this.passthroughColors[2] = this.colors[0];
        }
        if (layers & 0x08) {
            this.passthroughColors[3] = this.adjustedColors[0];
        } else {
            this.passthroughColors[3] = this.colors[0];
        }
        if (layers & 0x10) {
            this.passthroughColors[4] = this.adjustedColors[1];
        } else {
            this.passthroughColors[4] = this.colors[1];
        }
        if (layers & 0x20) {
            this.passthroughColors[5] = this.adjustedColors[0];
        } else {
            this.passthroughColors[5] = this.colors[0];
        }
    }

    resetPalettes(): void {
        const outPalette = this.adjustedColors[0];
        const inPalette = this.colors[0];
        for (let i = 0; i < 256; ++i) {
            outPalette[i] = this.adjustColor(inPalette[i]);
        }

        const outPalette1 = this.adjustedColors[1];
        const inPalette1 = this.colors[1];
        for (let i = 0; i < 256; ++i) {
            outPalette1[i] = this.adjustColor(inPalette1[i]);
        }
    }

    /**
     * 
     * @param layer 
     * @param index 
     */
    accessColor(layer: number, index: number): number {
        return this.passthroughColors[layer][index];
    }

    /**
     * 
     * @param color 
     */
    adjustColorDark(color: number): number {
        let r = (color & 0x001F);
        let g = (color & 0x03E0) >> 5;
        let b = (color & 0x7C00) >> 10;

        r = r - (r * this.blendY);
        g = g - (g * this.blendY);
        b = b - (b * this.blendY);

        return r | (g << 5) | (b << 10);
    }

    /**
     * 
     * @param color 
     */
    adjustColorBright(color: number): number {
        let r = (color & 0x001F);
        let g = (color & 0x03E0) >> 5;
        let b = (color & 0x7C00) >> 10;

        r = r + ((31 - r) * this.blendY);
        g = g + ((31 - g) * this.blendY);
        b = b + ((31 - b) * this.blendY);

        return r | (g << 5) | (b << 10);
    }



    setBlendY(y: number): void {
        if (this.blendY != y) {
            this.blendY = y;
            this.resetPalettes();
        }
    }

}