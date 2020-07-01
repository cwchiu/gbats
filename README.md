GBA.ts
======

* fork from [endrift/gbajs](https://github.com/endrift/gbajs)
* 練習 Typescript 
* 學習 GBA 模擬器實現

## 開發環境

* Windows 10
* deno 1.1.2

## 開始使用

編譯輸出 .js

> deno bundle src\mod.ts dist\gba.js

啟動靜態服務器

> deno run --allow-net --allow-read server.ts

瀏覽器開啟

> http://127.0.0.1:8080/index-ts.html

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

## GBA 初始化

* GameBoyAdvance.setCanvas() 關聯 canvas 做為顯示區域
* GameBoyAdvance.(setBios) 將 bios.bin 載入

## ROM 載入流程

* (gba.js)GameBoyAdvance.loadRomFromFile
  * (gba.js)GameBoyAdvance.setRom
    * (gba.js)GameBoyAdvance.reset() ; 所有元件重置
    * (mmu.js)mmu.loadRom
  
## 儲存遊戲狀態

* (gba.js) GameBoyAdvance.downloadSavedata()
* mmu.save.buffer 取得狀態 ArrayBuffer 
* Blob to URL 將 ArrayBuffer 下載

## 架構

TODO

## Arm/Thumb 指令集

TODO


## 相關專案

* [GitHub - mgba-emu/mgba: mGBA Game Boy Advance Emulator](https://github.com/mgba-emu/mgba)

## 參考資料

* [Writing a Game Boy Advance Game | reinterpretcast.com](https://www.reinterpretcast.com/writing-a-game-boy-advance-game)
