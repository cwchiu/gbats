// import MemoryView from "./MemoryView.ts";
import GameBoyAdvanceMMU from "./GameBoyAdvanceMMU.ts";
import { IGBAMMU, IClose, IClear, IContext } from "../interfaces.ts";

function factoryMMU(ctx: IContext):IGBAMMU | IClose | IClear {
    return new GameBoyAdvanceMMU(ctx);
}

export {
    factoryMMU
};