import { IGPIO, IGBARTC, IGBA, IROMView } from "../interfaces.ts";
import GameBoyAdvanceRTC from "./GameBoyAdvanceRTC.ts";

export default class GameBoyAdvanceGPIO implements IGPIO {

    core: IGBA
    rom: IROMView
    readWrite: number
    direction: number
    device: IGBARTC

    constructor(core: IGBA, rom: IROMView) {
        this.core = core;
        this.rom = rom;

        this.readWrite = 0;
        this.direction = 0;

        this.device = new GameBoyAdvanceRTC(this); // TODO: Support more devices
    }

    store16(offset: number, value: number): void {
        switch (offset) {
            case 0xC4:
                this.device.setPins(value & 0xF);
                break;
            case 0xC6:
                this.direction = value & 0xF;
                this.device.setDirection(this.direction);
                break;
            case 0xC8:
                this.readWrite = value & 1;
                break;
            default:
                throw new Error('BUG: Bad offset passed to GPIO: ' + offset.toString(16));
        }
        if (this.readWrite) {
            var old = this.rom.view.getUint16(offset, true);
            old &= ~this.direction;
            this.rom.view.setUint16(offset, old | (value & this.direction), true);
        }
    }

    store32(offset: number, value: number): void {
        throw new Error("no implements");
    }

    outputPins(nybble: number): void {
        if (this.readWrite) {
            let old = this.rom.view.getUint16(0xC4, true);
            old &= this.direction;
            this.rom.view.setUint16(0xC4, old | (nybble & ~this.direction & 0xF), true);
        }
    }

}