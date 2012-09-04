function GameBoyAdvanceAudio() {
	if (window.webkitAudioContext) {
		var self = this;
		this.context = new webkitAudioContext();
		this.bufferSize = 0;
		if (this.context.sampleRate >= 44100) {
			this.bufferSize = 2048;
		} else {
			this.bufferSize = 1024;
		}
		this.buffers = [new Float32Array(this.bufferSize << 2), new Float32Array(this.bufferSize << 2)];
		this.sampleMask = (this.bufferSize << 2) - 1;
		this.jsAudio = this.context.createJavaScriptNode(this.bufferSize);
		this.jsAudio.onaudioprocess = function(e) { GameBoyAdvanceAudio.audioProcess(self, e) };
		this.jsAudio.connect(this.context.destination);
	} else {
		this.context = null;
	}
};

GameBoyAdvanceAudio.prototype.clear = function() {
	this.fifoA = [];
	this.fifoB = [];
	this.fifoASample = 0;
	this.fifoBSample = 0;

	this.enabled = false;

	this.enableChannel3 = false;
	this.enableChannel4 = false;
	this.enableChannelA = false;
	this.enableChannelB = false;
	this.enableRightChannelA = false;
	this.enableLeftChannelA = false;
	this.enableRightChannelB = false;
	this.enableLeftChannelB = false;

	this.masterVolumeLeft = 0;
	this.masterVolumeRight = 0;

	this.dmaA = -1;
	this.dmaB = -1;
	this.soundTimerA = 0;
	this.soundTimerB = 0;

	this.soundRatio = 1;

	this.squareChannels = new Array();
	for (var i = 0; i < 2; ++i) {
		this.squareChannels[i] = {
			enabled: 0,
			sample: 0,
			duty: 0.5,
			increment: 0,
			step: 0,
			initialVolume: 0,
			volume: 0,
			interval: 0,
			raise: 0,
			lower: 0,
			nextStep: 0,
			end: 0
		}
	}

	this.waveData = new Uint8Array(32);
	this.channel3Dimenstion = 0;
	this.channel3Bank = 0;
	this.channel3Volume = 0;
	this.channel3Interval = 0;
	this.channel3Next = 0;
	this.channel3Pointer =0;
	this.channel3Sample = 0;

	this.cpuFrequency = this.core.irq.FREQUENCY;

	this.channel4 = {
		sample: 0,
		lfsr: 0,
		width: 15,
		interval: this.cpuFrequency / 524288,
		increment: 0,
		step: 0,
		initialVolume: 0,
		volume: 0,
		nextStep: 0,
	};

	this.nextEvent = 0;

	this.nextSample = 0;
	this.outputPointer = 0;
	this.samplePointer = 0;

	if (this.context) {
		this.sampleInterval = this.cpuFrequency / this.context.sampleRate;
	} else {
		this.sampleInterval = this.cpuFrequency;
	}

	this.writeSquareChannelFC(0, 0);
	this.writeSquareChannelFC(1, 0);
	this.writeChannel4FC(0);
};

GameBoyAdvanceAudio.prototype.updateTimers = function() {
	var cycles = this.cpu.cycles;
	if (!this.enabled || cycles < this.nextEvent) {
		return;
	}

	this.nextEvent += this.sampleInterval;

	var channel = this.squareChannels[0];
	if (channel.enabled) {
		this.updateSquareChannel(channel, cycles);
	}

	channel = this.squareChannels[1];
	if (channel.enabled) {
		this.updateSquareChannel(channel, cycles);
	}

	if (this.enableChannel3 && this.channel3Write) {
		if (cycles >= this.channel3Next) {
			var sample = this.waveData[this.channel3Pointer >> 1];
			this.channel3Sample = (((sample >> ((this.channel3Pointer & 1) << 2)) & 0xF) - 0x8) / 8;
			this.channel3Pointer = (this.channel3Pointer + 1);
			this.channel3Next += this.channel3Interval;
			if (this.channel3Dimension && this.channel3Pointer >= 64) {
				this.channel3Pointer -= 64;
			} else if (!this.channel3Bank && this.channel3Pointer >= 32) {
				this.channel3Pointer -= 32;
			} else if (this.channel3Pointer >= 64) {
				this.channel3Pointer -= 32;
			}
		}
		if (this.channel3Interval) {
			if (this.nextEvent > this.channel3Next) {
				this.nextEvent = this.channel3Next;
			}
		}
	}

	if (this.enableChannel4) {
		if (cycles >= this.channel4.next) {
			this.channel4.lfsr >>= 1;
			var sample = this.channel4.lfsr & 1;
			this.channel4.lfsr |= (((this.channel4.lfsr >> 1) & 1) ^ sample) << (this.channel4.width - 1);
			this.channel4.next += this.channel4.interval;
			this.channel4.sample = (sample - 0.5) * 2 * this.channel4.volume;
		}
		this.updateEnvelope(this.channel4, cycles);
		if (this.nextEvent > this.channel4.next) {
			this.nextEvent = this.channel4.next;
		}
	}

	if (cycles >= this.nextSample) {
		this.sample();
		this.nextSample += this.sampleInterval;
	}

	this.nextEvent = Math.ceil(this.nextEvent);
	if (this.nextEvent < cycles) {
		// STM instructions may take a long time
		this.updateTimers();
	}
};

GameBoyAdvanceAudio.prototype.writeEnable = function(value) {
	this.enabled = value;
	this.nextEvent = this.cpu.cycles;
	this.nextSample = this.nextEvent;
	this.updateTimers();
	this.core.irq.pollNextEvent();
};

GameBoyAdvanceAudio.prototype.writeSoundControlLo = function(value) {
	this.masterVolumeLeft = value & 0x7;
	this.masterVolumeRight = (value >> 4) & 0x7;
	var enabledLeft = (value >> 8) & 0xF;
	var enabledRight = (value >> 12) & 0xF;

	this.setSquareChannelEnabled(this.squareChannels[0], (enabledLeft | enabledRight) & 0x1);
	this.setSquareChannelEnabled(this.squareChannels[1], (enabledLeft | enabledRight) & 0x2);
	this.enableChannel3 = (enabledLeft | enabledRight) & 0x4;
	this.setChannel4Enabled((enabledLeft | enabledRight) & 0x8);

	this.updateTimers();
	this.core.irq.pollNextEvent();
};

GameBoyAdvanceAudio.prototype.writeSoundControlHi = function(value) {
	switch (value & 0x0003) {
	case 0:
		this.soundRatio = 0.25;
		break;
	case 1:
		this.soundRatio = 0.50;
		break;
	case 2:
		this.soundRatio = 1;
		break;
	}
	this.ratioChannelA = (((value & 0x0004) >> 2) + 1) * 0.5;
	this.ratioChannelB = (((value & 0x0008) >> 3) + 1) * 0.5;

	this.enableRightChannelA = value & 0x0100;
	this.enableLeftChannelA = value & 0x0200;
	this.enableChannelA  = value & 0x0300;
	this.soundTimerA = value & 0x0400;
	if (value & 0x0800) {
		this.fifoA = [];
	}
	this.enableRightChannelB = value & 0x1000;
	this.enableLeftChannelB = value & 0x2000;
	this.enableChannelB  = value & 0x3000;
	this.soundTimerB = value & 0x4000;
	if (value & 0x8000) {
		this.fifoB = [];
	}
};

GameBoyAdvanceAudio.prototype.resetSquareChannel = function(channel) {
	if (channel.step) {
		channel.nextStep = this.cpu.cycles + channel.step;
	}
	this.updateTimers();
	this.core.irq.pollNextEvent();
};

GameBoyAdvanceAudio.prototype.setSquareChannelEnabled = function(channel, enable) {
	if (!channel.enabled && enable) {
		channel.enabled = enable;
		channel.raise = this.cpu.cycles;
		channel.lower = channel.raise + channel.duty * channel.interval;
		this.nextEvent = this.cpu.cycles;
		this.updateTimers();
		this.core.irq.pollNextEvent();
	} else {
		channel.enabled = enable;
	}
};

GameBoyAdvanceAudio.prototype.writeSquareChannelDLE = function(channelId, value) {
	var channel = this.squareChannels[channelId];
	var duty = (value >> 6) & 0x3;
	switch (duty) {
	case 0:
		channel.duty = 0.125;
		break;
	case 1:
		channel.duty = 0.25;
		break;
	case 2:
		channel.duty = 0.5;
		break;
	case 3:
		channel.duty = 0.75;
		break;
	}
	this.writeChannelLE(channel, value);
	this.resetSquareChannel(channel);
};

GameBoyAdvanceAudio.prototype.writeSquareChannelFC = function(channelId, value) {
	var channel = this.squareChannels[channelId];
	var frequency = 131072 / (2048 - (value & 2047));
	channel.interval = this.cpuFrequency / frequency;

	if (value & 0x8000) {
		this.resetSquareChannel(channel);
		channel.volume = channel.initialVolume;
	}
};

GameBoyAdvanceAudio.prototype.updateSquareChannel = function(channel, cycles) {
	if (cycles >= channel.raise) {
		channel.sample = channel.volume;
		channel.lower = channel.raise + channel.duty * channel.interval;
		channel.raise += channel.interval;
	}
	if (cycles >= channel.lower) {
		channel.sample = -channel.volume;
		channel.lower += channel.interval;
	}

	this.updateEnvelope(channel, cycles);

	if (this.nextEvent > channel.raise) {
		this.nextEvent = channel.raise;
	}
	if (this.nextEvent > channel.lower) {
		this.nextEvent = channel.lower;
	}
};

GameBoyAdvanceAudio.prototype.writeChannel3Lo = function(value) {
	this.channel3Dimension = value & 0x20;
	this.channel3Bank = value & 0x40;
	var enable = value & 0x80;
	if (!this.channel3Write && enable) {
		this.channel3Write = enable;
		this.resetChannel3();
	} else {
		this.channel3Write = enable;
	}
};

GameBoyAdvanceAudio.prototype.writeChannel3Hi = function(value) {
	var length = value & 0xFF;
	var volume = (value >> 13) & 0x7;
	switch (volume) {
	case 0:
		this.channel3Volume = 0;
		break;
	case 1:
		this.channel3Volume = 1;
		break;
	case 2:
		this.channel3Volume = 0.5;
		break;
	case 3:
		this.channel3Volume = 0.25;
		break;
	default:
		this.channel3Volume = 0.75;
	}
};

GameBoyAdvanceAudio.prototype.writeChannel3X = function(value) {
	this.channel3Interval = this.cpuFrequency * (2048 - (value & 0x7FF)) / 2097152;
	if (this.channel3Write) {
		this.resetChannel3();
	}
};

GameBoyAdvanceAudio.prototype.resetChannel3 = function() {
	this.channel3Next = this.cpu.cycles;
	this.nextEvent = this.channel3Next;
	this.updateTimers();
	this.core.irq.pollNextEvent();
};

GameBoyAdvanceAudio.prototype.writeWaveData = function(offset, data, width) {
	if (width == 2) {
		this.waveData[offset] = (data >> 8) & 0xFF;
		++offset;
	}
	this.waveData[offset] = data & 0xFF;
};

GameBoyAdvanceAudio.prototype.setChannel4Enabled = function(enable) {
	if (!this.enableChannel4 && enable) {
		this.channel4.next = this.cpu.cycles;
		this.enableChannel4 = enable;
		this.nextEvent = this.cpu.cycles;
		this.updateEnvelope(this.channel4);
		this.updateTimers();
		this.core.irq.pollNextEvent();
	} else {
		this.enableChannel4 = enable;
	}
}

GameBoyAdvanceAudio.prototype.writeChannel4LE = function(value) {
	this.writeChannelLE(this.channel4, value);
	this.resetChannel4();
};

GameBoyAdvanceAudio.prototype.writeChannel4FC = function(value) {
	var r = value & 0x7;
	if (!r) {
		r = 0.5;
	}
	var s = (value >> 4) & 0xF;
	var interval = this.cpuFrequency * (r * (2 << s)) / 524288;
	if (interval != this.channel4.interval) {
		this.channel4.interval = interval;
		this.resetChannel4();
	}

	var width = (value & 0x8) ? 7 : 15;
	if (width != this.channel4.width) {
		this.channel4.width = width;
		this.resetChannel4();
	}
	if (value & 0x8000) {
		this.resetChannel4();
	}
};

GameBoyAdvanceAudio.prototype.resetChannel4 = function() {
	if (this.channel4.width == 15) {
		this.channel4.lfsr = 0x4000;
	} else {
		this.channel4.lfsr = 0x40;
	}
	this.channel4.volume = this.channel4.initialVolume;
	if (this.channel4.step) {
		this.channel4.nextStep = this.cpu.cycles + this.channel4.step;
	}
	this.channel4.next = this.cpu.cycles;
	this.nextEvent = this.channel4.next;
	this.updateTimers();
	this.core.irq.pollNextEvent();
};

GameBoyAdvanceAudio.prototype.writeChannelLE = function(channel, value) {
	channel.end = this.cpu.cycles + this.cpuFrequency * ((value & 0x3F) / 256);

	if (value & 0x0800) {
		channel.increment = 1 / 15;
	} else {
		channel.increment = -1 / 15;
	}
	channel.initialVolume = ((value >> 12) & 0xF) / 15;

	channel.step = this.cpuFrequency * (((value >> 8) & 0x7) / 64);
};

GameBoyAdvanceAudio.prototype.updateEnvelope = function(channel, cycles) {
	if (channel.step) {
		if (cycles >= channel.nextStep) {
			channel.volume += channel.increment;
			if (channel.volume > 1) {
				channel.volume = 1;
			} else if (channel.volume < 0) {
				channel.volume = 0;
			}
			channel.nextStep += channel.step;
		}

		if (this.nextEvent > channel.nextStep) {
			this.nextEvent = channel.nextStep;
		}
	}
};

GameBoyAdvanceAudio.prototype.appendToFifoA = function(value) {
	var b;
	for (var i = 0; i < 4; ++i) {
		b = (value & 0xFF) << 24;
		value >>= 8;
		this.fifoA.push(b / 0x80000000);
	}
};

GameBoyAdvanceAudio.prototype.appendToFifoB = function(value) {
	var b;
	for (var i = 0; i < 4; ++i) {
		b = (value & 0xFF) << 24;
		value >>= 8;
		this.fifoB.push(b / 0x80000000);
	}
};

GameBoyAdvanceAudio.prototype.sampleFifoA = function() {
	if (!this.fifoA.length) {
		this.core.mmu.serviceDma(this.dmaA, this.core.irq.dma[this.dmaA]);
	}
	this.fifoASample = this.fifoA.shift();
};

GameBoyAdvanceAudio.prototype.sampleFifoB = function() {
	if (!this.fifoB.length) {
		this.core.mmu.serviceDma(this.dmaB, this.core.irq.dma[this.dmaB]);
	}
	this.fifoBSample = this.fifoB.shift();
};

GameBoyAdvanceAudio.prototype.scheduleFIFODma = function(number, info) {
	switch (info.dest) {
	case this.cpu.mmu.BASE_IO | this.cpu.irq.io.FIFO_A_LO:
		// FIXME: is this needed or a hack?
		info.dstControl = 2;
		this.dmaA = number;
		break;
	case this.cpu.mmu.BASE_IO | this.cpu.irq.io.FIFO_B_LO:
		info.dstControl = 2;
		this.dmaB = number;
		break;
	default:
		this.core.WARN('Tried to schedule FIFO DMA for non-FIFO destination');
		break;
	}
};

GameBoyAdvanceAudio.prototype.sample = function() {
	var sample = 0;
	var channel;

	// TODO: left and right
	channel = this.squareChannels[0];
	if (channel.enabled) {
		sample += channel.sample * this.soundRatio;
	}

	channel = this.squareChannels[1];
	if (channel.enabled) {
		sample += channel.sample * this.soundRatio;
	}

	if (this.enableChannel3) {
		sample += this.channel3Sample * this.soundRatio * this.channel3Volume;
	}

	if (this.enableChannel4) {
		sample += this.channel4.sample * this.soundRatio;
	}

	if (this.enableChannelA) {
		sample += this.fifoASample;
	}

	if (this.enableChannelB) {
		sample += this.fifoBSample;
	}

	var samplePointer = this.samplePointer;
	if (this.buffers) {
		this.buffers[0][samplePointer] = sample;
		this.buffers[1][samplePointer] = sample;
	}
	this.samplePointer = (samplePointer + 1) & this.sampleMask;
};

GameBoyAdvanceAudio.audioProcess = function(self, audioProcessingEvent) {
	var left = audioProcessingEvent.outputBuffer.getChannelData(0);
	var right = audioProcessingEvent.outputBuffer.getChannelData(1);
	var i;
	for (i = 0; i < self.bufferSize; ++i) {
		left[i] = self.buffers[0][self.outputPointer];
		right[i] = self.buffers[1][self.outputPointer];
		if (self.outputPointer != self.samplePointer) {
			self.outputPointer = (self.outputPointer + 1) & self.sampleMask;
		}
	}
};