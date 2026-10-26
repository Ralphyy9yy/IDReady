import { expect,it } from 'vitest'
import { createCalibrationPdf } from '../services/export/calibration'
import { PAPERS } from '../lib/units/papers'

it('creates an exact 50 mm calibration square on every paper and orientation',()=>{
  for(const paper of PAPERS)for(const orientation of ['portrait','landscape'] as const){
    const doc=createCalibrationPdf({paper,orientation})
    expect(doc.getNumberOfPages()).toBe(1)
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(orientation==='portrait'?paper.widthMm:paper.heightMm,3)
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(orientation==='portrait'?paper.heightMm:paper.widthMm,3)
    const rectangle=doc.output().match(/([\d.]+) ([\d.]+) ([\d.]+) (-[\d.]+) re/)
    expect(rectangle).not.toBeNull()
    expect(Number(rectangle![3])*25.4/72).toBeCloseTo(50,5)
    expect(-Number(rectangle![4])*25.4/72).toBeCloseTo(50,5)
    expect(doc.output()).toContain('Actual size / 100%')
    expect(doc.output()).not.toContain('/Subtype /Image')
  }
})
