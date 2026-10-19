import { describe,expect,it } from 'vitest'
import { containScale } from '../lib/geometry'
describe('crop geometry',()=>{it('covers landscape sources without stretching',()=>expect(containScale(1600,900,600,600)).toBeCloseTo(2/3));it('covers portrait sources',()=>expect(containScale(900,1600,600,600)).toBeCloseTo(2/3))})
