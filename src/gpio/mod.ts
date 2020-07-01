import GameBoyAdvanceIO from "./GameBoyAdvanceIO.ts";
import GameBoyAdvanceSIO from "./GameBoyAdvanceSIO.ts";
import GameBoyAdvanceGPIO from "./GameBoyAdvanceGPIO.ts";
import { IIO, ISIO, IClose, IClear } from "../interfaces.ts";

function factoryIO(): IIO | IClose | IClear {
    return new GameBoyAdvanceIO();
}

function factorySIO(): ISIO {
    return new GameBoyAdvanceSIO();
}

export {
    factorySIO,
    factoryIO,
    GameBoyAdvanceGPIO
};