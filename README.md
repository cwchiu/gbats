GBA.ts
======

* fork from [endrift/gbajs](https://github.com/endrift/gbajs)
* 練習 Typescript
* 學習 GBA 模擬器實現

## 原始目錄結構

```
/js 模擬器核心實現
  - gba.js ; class GameBoyAdvance
  - mmu.js ; class MemoryView, MemoryView, MemoryView, BIOSView, BadMemory, GameBoyAdvanceMMU
  - core.js ; class ARMCore
  - savedata.js ; class EEPROMSavedata, FlashSavedata, SRAMSavedata
/resources
  - bios.bin
- bios.S
```

## .gba 檔案格式

* 0xa0 ~ 0xab: ROM Name
* 0xac ~ 0xaf: code 
* 0xb0 ~ 0xb1: marker

## 按鍵對照

* A	Z
* B	X
* L	A
* R	S
* Start	Enter
* Select	\

## ROM 載入流程

* (gba.js)GameBoyAdvance.loadRomFromFile
* (gba.js)GameBoyAdvance.setRom
* (mmu.js)mmu.loadRom
  
## 相關專案

* [GitHub - mgba-emu/mgba: mGBA Game Boy Advance Emulator](https://github.com/mgba-emu/mgba)

## 參考資料

* [Writing a Game Boy Advance Game | reinterpretcast.com](https://www.reinterpretcast.com/writing-a-game-boy-advance-game)
