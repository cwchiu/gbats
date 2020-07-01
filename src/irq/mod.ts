import GameBoyAdvanceInterruptHandler from "./GameBoyAdvanceInterruptHandler.ts";
import { IIRQ, IClose, IContext } from "../interfaces.ts";

function factoryIRQ(ctx: IContext): IIRQ | IClose {
    return new GameBoyAdvanceInterruptHandler(ctx);
}

export {
    factoryIRQ
};