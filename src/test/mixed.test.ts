import { describe, expect, it } from 'vitest'
import { layoutMixedSheet, type SheetPhoto } from '../lib/geometry/mixed'
import { createMixedSheetPdf } from '../services/export/pdf'
import { encode } from 'fast-png'
import type { SheetSettings } from '../types'
const settings: SheetSettings = {paper:{id:'a4',label:'A4',widthMm:210,heightMm:297},orientation:'portrait',quantity:1,marginMm:10,gapMm:3,cuttingGuides:true}
const data = 'data:image/png;base64,' + btoa(String.fromCharCode(...encode({width:1,height:1,channels:4,data:new Uint8Array([255,0,0,255])})))
const photo = (id:number,widthMm:number,heightMm:number,quantity:number):SheetPhoto => ({id,data,size:{id:String(id),label:'Test',widthMm,heightMm},quantity})
describe('mixed photo sheets', () => {
  it('preserves photo identity, dimensions and quantities across pages without overlaps', () => {
    const photos=[photo(1,50.8,50.8,12),photo(2,35,45,20),photo(3,76.2,35.56,8)]
    const result=layoutMixedSheet(settings,photos)
    expect(result.items).toHaveLength(40)
    expect(result.pages).toBeGreaterThan(1)
    for(const item of result.items){
      expect(item.width).toBe(item.photo.size.widthMm)
      expect(item.x+item.width).toBeLessThanOrEqual(result.pageWidth-10+1e-8)
      expect(item.y+item.height).toBeLessThanOrEqual(result.pageHeight-10+1e-8)
      for(const other of result.items.filter(other=>other!==item&&other.page===item.page)){
        expect(item.x+item.width<=other.x||other.x+other.width<=item.x||item.y+item.height<=other.y||other.y+other.height<=item.y).toBe(true)
      }
    }
  })
  it('reports oversized photos instead of silently dropping them from PDF',()=>{
    const photos=[photo(1,250,250,1),photo(2,35,45,1)]
    expect(layoutMixedSheet(settings,photos).unfit).toEqual([1])
    expect(()=>createMixedSheetPdf(photos,settings)).toThrow()
  })
  it('exports the same page count and physical sizes as the preview in both orientations',()=>{
    for(const orientation of ['portrait','landscape'] as const){
      const options={...settings,orientation},photos=[photo(1,50.8,50.8,30),photo(2,35,45,5)]
      const doc=createMixedSheetPdf(photos,options)
      expect(doc.getNumberOfPages()).toBe(layoutMixedSheet(options,photos).pages)
      expect(doc.internal.pageSize.getWidth()).toBeCloseTo(orientation==='portrait'?210:297)
      expect(doc.output()).toMatch(/144\. 0 0 144\./)
    }
  })
})
