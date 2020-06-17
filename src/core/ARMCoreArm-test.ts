import ARMCoreArm from "./ARMCoreArm.ts";
import {ICPU, IGBAMMU, IGPRSMap} from "../interfaces.ts";

import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

Deno.test("constructAddressingMode1Immediate", () => {
    const cpu = {
        shifterOperand: 0,
        cycles: 0,
        cpsrC: 999
    } as ICPU;
    const arm = new ARMCoreArm(cpu);
    const ins = arm.constructAddressingMode1Immediate(0x1234);
    ins();
    assertEquals(cpu.shifterOperand, 0x1234);    
    assertEquals(cpu.shifterCarryOut, 999);
  });

Deno.test("constructUMLALS", () => {
    const cpu = {
        cycles: 0,
        cpsrZ: 0,
        cpsrN: 0,
        gprs: [
            1,2,3,4
        ] as IGPRSMap,
        mmu: {
            waitPrefetch32: v => {},
            waitMul: v => {}
        } as IGBAMMU
    } as ICPU;
    const arm = new ARMCoreArm(cpu);
    const ins = arm.constructUMLALS(0, 1, 2, 3, ()=> true );
    ins();
    assertEquals(cpu.cycles, 2);    
    assertEquals(cpu.cpsrN, 0);    
    assertEquals(cpu.cpsrZ, 0);    
    assertEquals(cpu.gprs[1], 14);          
  });
Deno.test("constructUMLAL", () => {
    const cpu = {
        cycles: 0,
        cpsrZ: 0,
        cpsrN: 0,
        gprs: [
            1,2,3,4
        ] as IGPRSMap,
        mmu: {
            waitPrefetch32: v => {},
            waitMul: v => {}
        } as IGBAMMU
    } as ICPU;
    const arm = new ARMCoreArm(cpu);
    const ins = arm.constructUMLAL(0, 1, 2, 3, ()=> true );
    ins();
    assertEquals(cpu.cycles, 2);    
    assertEquals(cpu.cpsrN, 0);    
    assertEquals(cpu.cpsrZ, 0);    
    assertEquals(cpu.gprs[1], 14);          
  });
Deno.test("constructUMULLS", () => {
    const cpu = {
        cycles: 0,
        cpsrZ: 0,
        cpsrN: 0,
        gprs: [
            1,2,3,4
        ] as IGPRSMap,
        mmu: {
            waitPrefetch32: v => {},
            waitMul: v => {}
        } as IGBAMMU
    } as ICPU;
    const arm = new ARMCoreArm(cpu);
    const ins = arm.constructUMULLS(0, 1, 2, 3, ()=> true );
    ins();
    assertEquals(cpu.cycles, 1);    
    assertEquals(cpu.cpsrN, 0);    
    assertEquals(cpu.cpsrZ, 0);    
    assertEquals(cpu.gprs[1], 12);    
    assertEquals(cpu.gprs[0], 0);    
  });

Deno.test("constructUMULL", () => {
    const cpu = {
        cycles: 0,
        gprs: [
            1,2,3,4
        ] as IGPRSMap,
        mmu: {
            waitPrefetch32: v => {},
            waitMul: v => {}
        } as IGBAMMU
    } as ICPU;
    const arm = new ARMCoreArm(cpu);
    const ins = arm.constructUMULL(0, 1, 2, 3, ()=> true );
    ins();
    assertEquals(cpu.cycles, 1);    
    assertEquals(cpu.gprs[1], 12);    
    assertEquals(cpu.gprs[0], 0);    
  });

Deno.test("constructAddressingMode4", () => {
    // const cpu = {
    //     shifterOperand: 0,
    //     cycles: 0,
    //     cpsrC: 999,
    //     gprs: [
    //         0,
    //         1
    //     ],
    //     instructionWidth: 0,
    //     execMode: 0,
    //     PC: 1,
    //     MODE_ARM: 0,
    //     shifterCarryOut: 0,
    //     mmu: {} as IGBAMMU
    // } as ICPU;
    const cpu = {
        gprs: [
            0, 1
        ] as IGPRSMap
    } as ICPU;    
    const arm = new ARMCoreArm(cpu);
    const ins = arm.constructAddressingMode4(2, 1);
    const ret = ins();
    assertEquals(ret, 3);        
  });