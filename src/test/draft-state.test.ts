import { expect,it } from 'vitest'
import { defaultSheetSettings,sameAsaPair } from '../features/drafts/state'
import type { AsaPair, Transform } from '../types'

const transform:Transform={x:0,y:0,zoom:1,rotation:0,brightness:100,contrast:100,borderStyle:'none'}
it('creates independent defaults for older drafts',()=>{
  const a=defaultSheetSettings(),b=defaultSheetSettings()
  a.quantity=22
  expect(b.quantity).toBe(8)
  expect(b.paper.id).toBe('a4')
})
it('detects changes to original ASA portraits and framing',()=>{
  const photo=new Blob(['portrait'])
  const pair:AsaPair=[{photo,transform},undefined]
  expect(sameAsaPair(pair,[{photo,transform:{...transform}},undefined])).toBe(true)
  expect(sameAsaPair(pair,[{photo,transform:{...transform,zoom:2}},undefined])).toBe(false)
  expect(sameAsaPair(pair,[{photo:new Blob(['replacement']),transform},undefined])).toBe(false)
  expect(sameAsaPair(undefined,[undefined,undefined])).toBe(true)
})
it('keeps portrait blobs, transforms and export settings structured-cloneable',async()=>{
  const pair:AsaPair=[{photo:new Blob(['left']),transform},{photo:new Blob(['right']),transform:{...transform,zoom:1.7}}]
  const copy=structuredClone({asaPair:pair,sheetSettings:{...defaultSheetSettings(),quantity:17,gapMm:2.5}})
  expect(await copy.asaPair[1]!.photo.text()).toBe('right')
  expect(copy.asaPair[1]!.transform.zoom).toBe(1.7)
  expect(copy.sheetSettings.quantity).toBe(17)
  expect(copy.sheetSettings.gapMm).toBe(2.5)
})
