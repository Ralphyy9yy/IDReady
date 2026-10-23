import { jsPDF } from 'jspdf'
import { layoutSheet } from '../../lib/geometry'
import { cuttingGuides } from '../../lib/geometry/guides'
import type { PhotoSize, SheetSettings } from '../../types'

export function createSheetPdf(data:string,settings:SheetSettings,size:PhotoSize) {
  const layout=layoutSheet(settings,size)
  if(!layout.items.length)throw new Error('No photos fit on the selected paper.')
  const doc=new jsPDF({unit:'mm',format:[layout.pageWidth,layout.pageHeight],orientation:settings.orientation})
  for(let page=0;page<layout.pages;page++){
    if(page)doc.addPage([layout.pageWidth,layout.pageHeight],settings.orientation)
    for(const item of layout.items.filter(item=>item.page===page)){
      doc.addImage(data,'JPEG',item.x,item.y,item.width,item.height,undefined,'FAST')
      if(settings.cuttingGuides){
        doc.setDrawColor(110);doc.setLineWidth(.15)
        for(const line of cuttingGuides(item,settings.gapMm,settings.marginMm))doc.line(line.x1,line.y1,line.x2,line.y2)
      }
    }
  }
  return doc
}
