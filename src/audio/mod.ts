import GameBoyAdvanceAudio from "./GameBoyAdvanceAudio.ts";
import {IAudio, IClose, IClear, IContext} from "../interfaces.ts";

function factoryAudio(ctx: IContext):IAudio|IClose|IClear {
    return new GameBoyAdvanceAudio(ctx);
}
export {factoryAudio};