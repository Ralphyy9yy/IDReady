import { describe,it,expect,vi } from 'vitest'
import { drawPhoto } from '../services/image-processing/render'
import type { Transform } from '../types'
function context() {
  return {save:vi.fn(),restore:vi.fn(),fillRect:vi.fn(),beginPath:vi.fn(),rect:vi.fn(),clip:vi.fn(),translate:vi.fn(),rotate:vi.fn(),drawImage:vi.fn(),strokeRect:vi.fn(),fillText:vi.fn(),measureText:vi.fn((text:string)=>({width:text.length*4})),fillStyle:'',filter:'',font:'',textAlign:'',textBaseline:'',strokeStyle:'',lineWidth:0}
}
const t:Transform={x:.1,y:-.05,zoom:1.4,rotation:5,brightness:110,contrast:95,borderStyle:'none'}
describe('shared image transforms',()=>{
  it('name tags overlay without changing photo positioning or scale',()=>{
    const plain=context(),tagged=context(),image={} as CanvasImageSource
    drawPhoto(plain as unknown as CanvasRenderingContext2D,image,900,1200,600,600,t)
    drawPhoto(tagged as unknown as CanvasRenderingContext2D,image,900,1200,600,600,{...t,nameTag:{enabled:true,name:'TEST',secondLine:'',fontSize:5,alignment:'center'}})
    expect(tagged.drawImage.mock.calls).toEqual(plain.drawImage.mock.calls)
    expect(tagged.translate.mock.calls).toEqual(plain.translate.mock.calls)
    expect(tagged.fillText).toHaveBeenCalledOnce()
    expect(tagged.fillRect.mock.calls[1][2]).toBe(600)
  })
})
