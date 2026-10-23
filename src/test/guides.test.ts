import { describe,it,expect } from 'vitest'
import { cuttingGuides } from '../lib/geometry/guides'
describe('cutting guides',()=>{
  const item={x:10,y:10,width:50.8,height:50.8,page:0}
  it('generates all four corners, including bottom right',()=>expect(cuttingGuides(item,3,10)).toHaveLength(8))
  it('does not draw marks through neighboring photos in narrow gaps',()=>{
    const guides=cuttingGuides(item,.2,10)
    expect(Math.max(...guides.map(line=>Math.hypot(line.x2-line.x1,line.y2-line.y1)))).toBeLessThanOrEqual(.1)
  })
  it('omits guides when there is no safe gap',()=>expect(cuttingGuides(item,0,10)).toEqual([]))
})
