# writeDisplayControl(1)

* 沒有進入 writeDisplayControl


gprs[0] == 0 && gprs[1] == 0 && gprs[4] == 0 && grps[5] == 50331841


O 134220164
X 134218684
console.log(`${instruction.address}: ${instruction.opcode} ${instruction.writesPC} ${instruction.execMode} ${this.cpsrI} ${this.cpsrN} ${this.cpsrF} ${this.cpsrC} ${this.cpsrV} ${this.cpsrZ}`);
console.log(`${instruction.address}: ${instruction.opcode} ${gprs[0]} ${gprs[1]} ${gprs[4]} ${gprs[4]} ${gprs[12]} ${gprs[13]}`);

instruction.addresss == 136171798

offset=67109384

gprs 

* switchMode


* address: 134219454 gprs[0] = 1
* address: 134220518 gprs[0] = 0



67109384 1
67109378 0 Err: 應該為 1

gprs 錯誤
{}


---------------------------------------------------

constructSTRH1(rd, rn, immediate) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        // immediate = 0
                        // rn = 0
                        // n = 67108864
                        const n = gprs[rn] + immediate;
                        
                        // rd = 1                        
                        cpu.mmu.store16(n, gprs[rd]);
                        cpu.mmu.wait(gprs[cpu.PC]);
                        cpu.mmu.wait(n);
                    };
                }
                
//

GameBoyAdvanceMMU.prototype.store16 = function(offset, value) {
	var maskedOffset = offset & 0x00FFFFFE;
	var memory = this.memory[offset >>> this.BASE_OFFSET];
    // maskedOffset = 0
    // value = 0
	memory.store16(maskedOffset, value);
	memory.invalidatePage(maskedOffset);
};                

//
address = 134220276
xecMode: 1
fixedJump: false
next: null
opcode: -32767
writesPC: false
gprs[15] = 134220280


cpu.instruction.address
--------------------------------------------------------------------------
gprs[15] == 134218296 || gprs[15] == 134220280
-11780
ARMCore.js:3339 30728
ARMCore.js:3339 10399
ARMCore.js:3339 -11780
ARMCore.js:3339 30728
ARMCore.js:3339 10399
ARMCore.js:3339 -11780
ARMCore.js:3339 30728
ARMCore.js:3339 10399
ARMCore.js:3339 -11780
ARMCore.js:3339 30728
ARMCore.js:3339 10399
ARMCore.js:3339 -11780
ARMCore.js:3339 30728
ARMCore.js:3339 10399
ARMCore.js:3339 -11780
ARMCore.js:3339 30728
----------------------------------------------------------------------------
// 
gprs[15] = 134218296   // 還沒到就死了        

constructBX(rm, condOp) {
                    const cpu = this.cpu;
                    const gprs = cpu.gprs;
                    return function () {
                        if (condOp && !condOp()) {
                            cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                            return;
                        }
                        cpu.mmu.waitPrefetch32(gprs[cpu.PC]);
                        // rm = 1
                        // gprs = [0, 134218661]
                        cpu.switchExecMode(gprs[rm] & 0x00000001);
                        // 134218660
                        gprs[cpu.PC] = gprs[rm] & 0xFFFFFFFE;
                    };
                }
------------------------------------------------------------------------------
3925868550
core.js:98 3818976002
core.js:98 3925868671
core.js:98 3818913810
core.js:98 3777622016
core.js:98 3852455976
core.js:98 3818913823
core.js:98 3777622016
core.js:98 3852455960
core.js:98 3852406812
core.js:98 3801022496
core.js:98 3850436608
core.js:98 3852406804
core.js:98 3785416719
core.js:98 3778019089

------
畫面渲染

writeDisplayControl