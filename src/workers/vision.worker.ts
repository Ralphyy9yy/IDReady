import { detectFace, removeBackground } from '../services/ai/vision'
interface Request { id:number; kind:'segment'|'face'; image:ImageBitmap }
let queue=Promise.resolve()
self.onmessage=(event:MessageEvent<Request>)=>{
  const request=event.data
  queue=queue.then(async()=>{
    try {
      const value=request.kind==='segment'?await removeBackground(request.image):await detectFace(request.image)
      self.postMessage({id:request.id,value})
    }catch(error){self.postMessage({id:request.id,error:error instanceof Error?error.message:'Image processing failed.'})}
    finally{request.image.close()}
  })
}
