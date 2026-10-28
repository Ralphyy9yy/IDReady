import { PAPERS } from '../../lib/units/papers'
import type { AsaPair, SheetSettings } from '../../types'

export const defaultSheetSettings=():SheetSettings=>({paper:PAPERS[0],orientation:'portrait',quantity:8,marginMm:10,gapMm:3,cuttingGuides:true})
export function sameAsaPair(a:AsaPair|undefined,b:AsaPair|undefined) {
  return [0,1].every(index=>a?.[index]?.photo===b?.[index]?.photo&&JSON.stringify(a?.[index]?.transform)===JSON.stringify(b?.[index]?.transform))
}
