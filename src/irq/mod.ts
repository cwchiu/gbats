import GameBoyAdvanceInterruptHandler from "./GameBoyAdvanceInterruptHandler.ts";
import {IIRQ, IClose} from "../interfaces.ts";

function factoryIRQ():IIRQ|IClose {
    return new GameBoyAdvanceInterruptHandler();
}

export {
    factoryIRQ
};