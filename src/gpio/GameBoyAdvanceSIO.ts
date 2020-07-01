import { ILog, IContext, ILinkLayer, ISIO } from "../interfaces.ts";
import { hex } from "../utils.ts";

interface IMultiPlayer {
	baud: number
	si: number
	id: number
	error: number
	busy: number
	irq: number
	states: number[]
}

export default class GameBoyAdvanceSIO implements ISIO {
	SIO_NORMAL_8: number
	SIO_NORMAL_32: number
	SIO_MULTI: number
	SIO_UART: number
	SIO_GPIO: number
	SIO_JOYBUS: number
	BAUD: number[]

	mode: number = 0
	sd: boolean = false
	irq: number = 0
	core: IContext
	multiplayer: IMultiPlayer|null = null

	linkLayer: ILinkLayer | null = null
	constructor(ctx: IContext) {
		this.core = ctx;
		this.SIO_NORMAL_8 = 0;
		this.SIO_NORMAL_32 = 1;
		this.SIO_MULTI = 2;
		this.SIO_UART = 3;
		this.SIO_GPIO = 8;
		this.SIO_JOYBUS = 12;

		this.BAUD = [9600, 38400, 57600, 115200];
	}

	clear() {
		this.mode = this.SIO_GPIO;
		this.sd = false;

		this.irq = 0;
		this.multiplayer = {
			baud: 0,
			si: 0,
			id: 0,
			error: 0,
			busy: 0,
			irq: 0,
			states: [0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF]
		}

		this.linkLayer = null;
	}

	/**
	 * 
	 * @param mode 
	 */
	setMode(mode: number): void {
		if (mode & 0x8) {
			mode &= 0xC;
		} else {
			mode &= 0x3;
		}
		this.mode = mode;

		this.getLog().INFO('Setting SIO mode to ' + hex(mode, 1));
	}

	private getLog():ILog {
		return this.core.getLog();
	}

	/**
	 * 
	 * @param value 
	 */
	writeRCNT(value: number): void {
		if (this.mode != this.SIO_GPIO) {
			return;
		}

		this.getLog().STUB('General purpose serial not supported');
	}

	private getMultiPlayer():IMultiPlayer {
		if(!this.multiplayer){
			throw new Error("multipplayer no init");
		}
		return this.multiplayer as IMultiPlayer;
	}
	/**
	 * 
	 * @param value 
	 */
	writeSIOCNT(value: number): void {
		const log = this.getLog();
		const multiplayer = this.getMultiPlayer();
		switch (this.mode) {
			case this.SIO_NORMAL_8:
				log.STUB('8-bit transfer unsupported');
				break;
			case this.SIO_NORMAL_32:
				log.STUB('32-bit transfer unsupported');
				break;
			case this.SIO_MULTI:
				multiplayer.baud = value & 0x0003;
				if (this.linkLayer) {
					this.linkLayer.setBaud(this.BAUD[multiplayer.baud]);
				}

				if (!multiplayer.si) {
					multiplayer.busy = value & 0x0080;
					if (this.linkLayer && multiplayer.busy) {
						this.linkLayer.startMultiplayerTransfer();
					}
				}
				this.irq = value & 0x4000;
				break;
			case this.SIO_UART:
				log.STUB('UART unsupported');
				break;
			case this.SIO_GPIO:
				// This register isn't used in general-purpose mode
				break;
			case this.SIO_JOYBUS:
				log.STUB('JOY BUS unsupported');
				break;
		}
	}

	/**
	 * 
	 */
	readSIOCNT(): number {
		let value = (this.mode << 12) & 0xFFFF;
		const log = this.getLog();
		const multiplayer = this.getMultiPlayer();
		switch (this.mode) {
			case this.SIO_NORMAL_8:
				log.STUB('8-bit transfer unsupported');
				break;
			case this.SIO_NORMAL_32:
				log.STUB('32-bit transfer unsupported');
				break;
			case this.SIO_MULTI:
				value |= multiplayer.baud;
				value |= multiplayer.si;
				value |= (!!this.sd ? 1 : 0) << 3;
				value |= multiplayer.id << 4;
				value |= multiplayer.error;
				value |= multiplayer.busy;
				value |= (!!multiplayer.irq ? 1 : 0) << 14;
				break;
			case this.SIO_UART:
				log.STUB('UART unsupported');
				break;
			case this.SIO_GPIO:
				// This register isn't used in general-purpose mode
				break;
			case this.SIO_JOYBUS:
				log.STUB('JOY BUS unsupported');
				break;
		}
		return value;
	}

	/**
	 * 
	 * @param slot 
	 */
	read(slot: number): number {
		const log = this.getLog();
		const multiplayer = this.getMultiPlayer();
		switch (this.mode) {
			case this.SIO_NORMAL_32:
				log.STUB('32-bit transfer unsupported');
				break;
			case this.SIO_MULTI:
				return multiplayer.states[slot];
			case this.SIO_UART:
				log.STUB('UART unsupported');
				break;
			default:
				log.WARN('Reading from transfer register in unsupported mode');
				break;
		}
		return 0;
	}

}