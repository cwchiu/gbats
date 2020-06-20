import ARMCore from "./ARMCore.ts";
import { ICPU, IGBAMMU, IGPRSMap } from "../interfaces.ts";

import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

function _createCPU() {
    const cpu = new ARMCore();
    // @ts-ignore  
    cpu.mmu = {
        BASE_OFFSET: 24,
        OFFSET_MASK: 0x00FFFFFF,
        memory: [{
            PAGE_MASK: 131071
        }],
        addressToPage: () => 0,
    };
    // @ts-ignore  
    cpu.mmu.accessPage = (a, b) => {
        return {

        }
    };

    // @ts-ignore
    cpu.irq = {
        clear: () => { }
    };
    return cpu;
}
Deno.test("loadInstructionArm", () => {
    const cpu = _createCPU();
    cpu.mmu.load32 = () => 3925868550;

    // @ts-ignore  
    cpu.mmu.accessPage = (a, b) => {
        return {
            arm: []
        }
    };

    cpu.resetCPU(0);

    const op = cpu.loadInstructionArm(0);
    assertEquals(op.address, 0);    
    assertEquals(op.opcode, 3925868550);    
});

Deno.test("fetchPage", () => {
    const cpu = _createCPU();

    let actualA = 0;
    let actualB = 0;
    // @ts-ignore  
    cpu.mmu.accessPage = (a, b) => {
        actualA = a;
        actualB = b;
        return {

        }
    };

    cpu.resetCPU(0);

    assertEquals(cpu.pageRegion, -1);
    cpu.fetchPage(0);

    assertEquals(cpu.pageMask, 131071);
    assertEquals(cpu.pageRegion, 0);
    assertEquals(cpu.pageId, 0);
    assertEquals(actualA, 0);
    assertEquals(actualB, 0);
});
