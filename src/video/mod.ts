import GameBoyAdvanceVideo from "./GameBoyAdvanceVideo.ts";
import { IVideo, IClose, IClear, IContext } from "../interfaces.ts";

function factoryVideo(ctx: IContext): IVideo | IClose | IClear {
    return new GameBoyAdvanceVideo(ctx);
}

export {
    factoryVideo
};