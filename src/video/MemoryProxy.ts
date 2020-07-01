import MemoryView from "../mmu/MemoryView.ts";
import {IMemoryOwner, IMemoryProxy, IMemoryView} from "../interfaces.ts";

export default class MemoryProxy implements IMemoryProxy {
    blockSize: number = 0
    mask: number = 0
    size: number = 0
    blocks: IMemoryView[]
    owner: IMemoryOwner
    constructor(owner: IMemoryOwner, size: number, blockSize: number) {
        this.owner = owner;
        this.blocks = [];
        this.blockSize = blockSize;
        this.mask = (1 << blockSize) - 1;
        this.size = size;
        if (blockSize) {
            for (var i = 0; i < (size >> blockSize); ++i) {
                this.blocks.push(new MemoryView(new ArrayBuffer(1 << blockSize)));
            }
        } else {
            this.blockSize = 31;
            this.mask = -1;
            this.blocks[0] = new MemoryView(new ArrayBuffer(size));
        }
    }

    /**
     * 
     */
    combine(): ArrayBuffer {
        if (this.blocks.length > 1) {
            var combined = new Uint8Array(this.size);
            for (var i = 0; i < this.blocks.length; ++i) {
                combined.set(new Uint8Array(this.blocks[i].buffer), i << this.blockSize);
            }
            return combined.buffer;
        } else {
            return this.blocks[0].buffer;
        }
    }

    /**
     * 
     * @param buffer 
     */
    replace(buffer: ArrayBuffer): void {
        for (var i = 0; i < this.blocks.length; ++i) {
            this.blocks[i] = new MemoryView(buffer.slice(i << this.blockSize, (i << this.blockSize) + this.blocks[i].buffer.byteLength));
        }
    }

    private getBlockView(position: number): IMemoryView {
        return this.blocks[position];
    }

    load8(offset: number): number {
        return this.getBlockView(offset >> this.blockSize).load8(offset & this.mask);
    }

    load16(offset: number): number {
        return this.getBlockView(offset >> this.blockSize).load16(offset & this.mask);
    }

    loadU8(offset: number): number {
        return this.getBlockView(offset >> this.blockSize).loadU8(offset & this.mask);
    }

    loadU16(offset: number): number {
        return this.getBlockView(offset >> this.blockSize).loadU16(offset & this.mask);
    }

    load32(offset: number): number {
        return this.getBlockView(offset >> this.blockSize).load32(offset & this.mask);
    }

    store8(offset: number, value: number): void {
        if (offset >= this.size) {
            return;
        }
        this.owner.memoryDirtied(this, offset >> this.blockSize);
        const blockView = this.getBlockView(offset >> this.blockSize);
        blockView.store8(offset & this.mask, value);
        blockView.store8((offset & this.mask) ^ 1, value);
    }

    store16(offset: number, value: number): void {
        if (offset >= this.size) {
            return;
        }
        this.owner.memoryDirtied(this, offset >> this.blockSize);
        return this.getBlockView(offset >> this.blockSize).store16(offset & this.mask, value);
    }

    store32(offset: number, value: number): void {
        if (offset >= this.size) {
            return;
        }
        this.owner.memoryDirtied(this, offset >> this.blockSize);
        return this.getBlockView(offset >> this.blockSize).store32(offset & this.mask, value);
    }

    invalidatePage(address: number) { };

}