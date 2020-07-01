import GameBoyAdvanceKeypad from "./GameBoyAdvanceKeypad.ts";
import {IKeypad} from "../interfaces.ts";

function factoryKeypad():IKeypad {
    return new GameBoyAdvanceKeypad();
}

export {
    factoryKeypad
};