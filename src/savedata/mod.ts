// https://github.com/mgba-emu/mgba/blob/master/src/gba/savedata.c
// SRAM
// FLASH1M
// FLASH512
// EEPROM
// EEPROM512

import EEPROMSavedata from "./EEPROMSavedata.ts";
import FlashSavedata from "./FlashSavedata.ts";
import SRAMSavedata from "./SRAMSavedata.ts";

export {
    EEPROMSavedata,
    FlashSavedata,
    SRAMSavedata
};