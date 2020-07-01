// https://github.com/mgba-emu/mgba/blob/master/src/gba/savedata.c
// SRAM
// FLASH1M
// FLASH512
// EEPROM
// EEPROM512

import EEPROMSavedata from "./EEPROMSavedata.ts";
import FlashSavedata from "./FlashSavedata.ts";
import SRAMSavedata from "./SRAMSavedata.ts";
import { MemoryRegion, MemoryRegionSize, ISave, IMemoryView, IIO } from "../interfaces.ts";

interface IFactoryResult {
    region: number
    savedata: ISave | IMemoryView | IIO,
    saveType: string
}

function factory(saveType: string): IFactoryResult {
    switch (saveType) {
        case 'FLASH_V':
        case 'FLASH512_V':
            return {
                region: MemoryRegion.CART_SRAM as number,
                savedata: new FlashSavedata(MemoryRegionSize.CART_FLASH512),
                saveType
            };
        case 'FLASH1M_V':
            return {
                region: MemoryRegion.CART_SRAM as number,
                savedata: new FlashSavedata(MemoryRegionSize.CART_FLASH1M),
                saveType
            };
        case 'SRAM_V':
            return {
                region: MemoryRegion.CART_SRAM as number,
                savedata: new SRAMSavedata(MemoryRegionSize.CART_SRAM),
                saveType
            };
        case 'EEPROM_V':
            return {
                region: MemoryRegion.CART2 + 1,
                savedata: new EEPROMSavedata(MemoryRegionSize.CART_EEPROM),
                saveType
            };
    }

    return {
        region: MemoryRegion.CART_SRAM,
        savedata: new SRAMSavedata(MemoryRegionSize.CART_SRAM),
        saveType: 'SRAM_V'
    };
}

export {
    EEPROMSavedata,
    FlashSavedata,
    SRAMSavedata,
    factory
};