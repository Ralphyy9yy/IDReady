import { describe, expect, it } from 'vitest'
import { inToMm, mmToPx, mmToIn } from '../lib/units'
describe('physical units',()=>{it('converts inches and millimetres',()=>{expect(inToMm(2)).toBe(50.8);expect(mmToIn(50.8)).toBe(2)});it('uses nearest-pixel rounding at 300 DPI',()=>{expect(mmToPx(25.4)).toBe(300);expect(mmToPx(50.8)).toBe(600);expect(mmToPx(35)).toBe(413);expect(mmToPx(45)).toBe(531)})})
