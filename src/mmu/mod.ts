// import ROMView from "./ROMView.ts";
// import BadMemory from "./BadMemory.ts";
import MemoryBlock from "./MemoryBlock.ts";
// import BIOSView from "./BIOSView.ts";
// import MemoryView from "./MemoryView.ts";
import GameBoyAdvanceMMU from "./GameBoyAdvanceMMU.ts";
import { IGBAMMU, IClose, IClear, IContext } from "../interfaces.ts";

function factoryMMU(ctx: IContext):IGBAMMU | IClose | IClear {
    return new GameBoyAdvanceMMU(ctx);
}

export {
    // ROMView,
    // BadMemory,
    // MemoryBlock,
    // BIOSView,
    // MemoryView,
    // GameBoyAdvanceMMU
    factoryMMU
};