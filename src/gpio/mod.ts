import GameBoyAdvanceIO from "./GameBoyAdvanceIO.ts";
import GameBoyAdvanceSIO from "./GameBoyAdvanceSIO.ts";
import GameBoyAdvanceGPIO from "./GameBoyAdvanceGPIO.ts";
import { IIO, ISIO, IClose, IClear, IContext } from "../interfaces.ts";

function factoryIO(ctx: IContext): IIO | IClose | IClear {
    return new GameBoyAdvanceIO(ctx);
}

function factorySIO(ctx: IContext): ISIO {
    return new GameBoyAdvanceSIO(ctx);
}

export {
    factorySIO,
    factoryIO,
    GameBoyAdvanceGPIO
};