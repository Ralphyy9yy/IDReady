import { jsPDF } from 'jspdf'
import type { SheetSettings } from '../../types'

export function createCalibrationPdf(settings:Pick<SheetSettings,'paper'|'orientation'>) {
  const landscape=settings.orientation==='landscape'
  const width=landscape?settings.paper.heightMm:settings.paper.widthMm
  const height=landscape?settings.paper.widthMm:settings.paper.heightMm
  const doc=new jsPDF({unit:'mm',format:[width,height],orientation:settings.orientation})
  const compact=height<120,x=compact?12:(width-50)/2,y=compact?25:38
  doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text('IDReady print size check',12,14)
  doc.setFont('helvetica','normal');doc.setFontSize(8)
  doc.text(`${settings.paper.label} - ${width} x ${height} mm - ${settings.orientation}`,12,21)
  doc.setLineWidth(.2);doc.setDrawColor(30);doc.rect(x,y,50,50)
  doc.setFontSize(9);doc.text('50 x 50 mm',x+25,y+24,{align:'center'})
  doc.setFontSize(7);doc.text('Measure between line centers',x+25,y+29,{align:'center'})
  for(let mm=0;mm<=50;mm+=5){
    const tick=mm%10===0?2:1
    doc.line(x+mm,y,x+mm,y+tick)
    doc.line(x,y+mm,x+tick,y+mm)
  }
  const textX=compact?72:12,textY=compact?31:103,textWidth=compact?width-84:width-24
  doc.setFontSize(8)
  const instructions='Print at Actual size / 100%. Turn OFF Fit to page. Measure between line centers: both sides must be 50 mm. If not, check paper size and printer scaling, then repeat.'
  doc.text(doc.splitTextToSize(instructions,textWidth),textX,textY)
  doc.setFontSize(7);doc.setTextColor(90)
  doc.text('Calibration only - no customer photo included.',12,height-7)
  return doc
}
