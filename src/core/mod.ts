import ARMCore from "./ARMCore.ts";
import {ICPU} from "../interfaces.ts";

function factoryCPU(): ICPU{
    return new ARMCore();
}

export {
    factoryCPU
};