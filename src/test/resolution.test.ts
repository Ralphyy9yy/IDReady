import { expect,it } from 'vitest'
import { effectivePpi } from '../lib/geometry/resolution'

it('measures source resolution at printed size',()=>expect(effectivePpi(600,600,{id:'test',label:'test',widthMm:50.8,heightMm:50.8},1)).toBeCloseTo(300))
it('accounts for crop zoom',()=>expect(effectivePpi(600,600,{id:'test',label:'test',widthMm:50.8,heightMm:50.8},2)).toBeCloseTo(150))
it('uses the limiting source dimension for a cover crop',()=>expect(effectivePpi(1200,600,{id:'test',label:'test',widthMm:25.4,heightMm:25.4},1)).toBeCloseTo(600))
