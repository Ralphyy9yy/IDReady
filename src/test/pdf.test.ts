import { describe,it,expect } from 'vitest'
import { createSheetPdf } from '../services/export/pdf'
import type { SheetSettings } from '../types'
import { encode } from 'fast-png'
const settings:SheetSettings={paper:{id:'a4',label:'A4',widthMm:210,heightMm:297},orientation:'portrait',quantity:16,marginMm:10,gapMm:3,cuttingGuides:true}
const pixel='data:image/png;base64,'+btoa(String.fromCharCode(...encode({width:1,height:1,channels:4,data:new Uint8Array([255,0,0,255])})))
describe('PDF output',()=>{
  it('writes A4 pages and exact 2-inch photo placement matrices',()=>{
    const doc=createSheetPdf(pixel,settings,{id:'2x2',label:'2x2',widthMm:50.8,heightMm:50.8})
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(210,3)
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(297,3)
    expect(doc.getNumberOfPages()).toBe(2)
    expect(doc.output()).toMatch(/144\. 0 0 144\./)
  })
})
