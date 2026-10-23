import type { LayoutItem } from '../../types'
export interface CutLine {x1:number;y1:number;x2:number;y2:number}

// Cap marks at half a gap so neighboring photos are never crossed.
export function cuttingGuides(item:LayoutItem,gap:number,margin:number):CutLine[] {
  const length=Math.min(2,gap/2,margin)
  const offset=Math.min(.4,length/3)
  if(length<=offset)return []
  const lines:CutLine[]=[]
  for(const x of [item.x,item.x+item.width])for(const y of [item.y,item.y+item.height]){
    const sx=x===item.x?-1:1,sy=y===item.y?-1:1
    lines.push({x1:x+sx*offset,y1:y,x2:x+sx*length,y2:y},{x1:x,y1:y+sy*offset,x2:x,y2:y+sy*length})
  }
  return lines
}
