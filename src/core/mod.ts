import ARMCore from "./ARMCore.ts";
import {ICPU, IContext} from "../interfaces.ts";

function factoryCPU(ctx: IContext): ICPU{
    return new ARMCore(ctx);
}

export {
    factoryCPU
};