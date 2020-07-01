import GameBoyAdvanceVideo from "./GameBoyAdvanceVideo.ts";
import { IVideo, IClose, IClear } from "../interfaces.ts";

function factoryVideo(): IVideo | IClose | IClear {
    return new GameBoyAdvanceVideo();
}

export {
    factoryVideo
};