import {IVideoObject, IOAM, IVRAM, IRenderPath, IClose, IVideoPalette, IVideoObjectLayer} from "../interfaces.ts";
import GameBoyAdvanceOBJ from "./GameBoyAdvanceOBJ.ts";
import GameBoyAdvanceSoftwareRenderer from "./GameBoyAdvanceSoftwareRenderer.ts";
import GameBoyAdvancePalette from "./GameBoyAdvancePalette.ts";
import GameBoyAdvanceVRAM from "./GameBoyAdvanceVRAM.ts";
import GameBoyAdvanceOAM from "./GameBoyAdvanceOAM.ts";
import GameBoyAdvanceOBJLayer from "./GameBoyAdvanceOBJLayer.ts";

export function factoryVideoRenderer():IRenderPath|IClose {
    return new GameBoyAdvanceSoftwareRenderer();
}

export function factoryVideoObject(oam: IOAM, index: number):IVideoObject {
    return new GameBoyAdvanceOBJ(oam, index);
}

export function factoryOAM(size:number):IOAM{
    return new GameBoyAdvanceOAM(size);
}

export function factoryVideoRAM(size:number):IVRAM{
    return new GameBoyAdvanceVRAM(size);
}

export function factoryVideoPalette():IVideoPalette{
    return new GameBoyAdvancePalette()
}

export function factoryVideoObjectLayer(renderPath: IRenderPath, index: number): IVideoObjectLayer {
    return new GameBoyAdvanceOBJLayer(renderPath, index)
}