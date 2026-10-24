import { effectivePpi } from '../../lib/geometry/resolution'
import type { PhotoSize } from '../../types'

export function ResolutionNotice({image,size,zoom}:{image:ImageBitmap;size:PhotoSize;zoom:number}) {
  const ppi=effectivePpi(image.width,image.height,size,zoom)
  if(ppi>=300)return null
  return <div className="notice resolution-notice" role="status"><strong>{ppi<150?'Low photo resolution':'Photo resolution below 300 PPI'}</strong><br/>About {Math.round(ppi)} source pixels per inch at this crop. {ppi<150?'Prints may look blurry.':'Fine detail may look soft.'} Try less zoom, a smaller photo size, or a higher-resolution original. Exporting at 300 DPI does not add missing detail.</div>
}
