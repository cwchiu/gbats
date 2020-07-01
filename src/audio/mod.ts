import GameBoyAdvanceAudio from "./GameBoyAdvanceAudio.ts";
import {IAudio, IClose, IClear} from "../interfaces.ts";

function factoryAudio():IAudio|IClose|IClear {
    return new GameBoyAdvanceAudio();
}
export {factoryAudio};