interface FaceBox { originX:number; originY:number; width:number; height:number }
let worker:Worker|undefined
let failed=false
let id=0
let sequence=Promise.resolve()
const pending=new Map<number,{resolve:(value:unknown)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>()

function stopWorker(error:Error) {
  failed=true;worker?.terminate();worker=undefined
  for(const job of pending.values()){clearTimeout(job.timer);job.reject(error)}
  pending.clear()
}
async function request(kind:'segment'|'face', image:ImageBitmap):Promise<unknown> {
  if(!worker){
    worker=new Worker(new URL('../../workers/vision.worker.ts',import.meta.url))
    worker.onmessage=(event:MessageEvent<{id:number;value?:unknown;error?:string}>)=>{
      const job=pending.get(event.data.id);if(!job)return
      clearTimeout(job.timer);pending.delete(event.data.id)
      if(event.data.error)job.reject(new Error(event.data.error));else job.resolve(event.data.value)
    }
    worker.onerror=()=>stopWorker(new Error('The processing worker could not start.'))
  }
  const copy=await createImageBitmap(image)
  return new Promise((resolve,reject)=>{
    const key=++id
    const timer=setTimeout(()=>stopWorker(new Error('Processing timed out. Retry with a smaller image.')),120000)
    pending.set(key,{resolve,reject,timer})
    try{worker!.postMessage({id:key,kind,image:copy},[copy])}catch(error){copy.close();clearTimeout(timer);pending.delete(key);reject(error)}
  })
}
function run<T>(kind:'segment'|'face',image:ImageBitmap):Promise<T> {
  let resolve!:(value:T)=>void,reject!:(error:unknown)=>void
  const result=new Promise<T>((yes,no)=>{resolve=yes;reject=no})
  sequence=sequence.then(async()=>{
    try{
      if(!failed&&typeof Worker!=='undefined'&&typeof OffscreenCanvas!=='undefined'){
        try{resolve(await request(kind,image) as T);return}catch{stopWorker(new Error('Using compatibility processing.'))}
      }
      const fallback=await import('./vision')
      resolve((kind==='segment'?await fallback.removeBackground(image):await fallback.detectFace(image)) as T)
    }catch(error){reject(error)}
  })
  return result
}
export const removeBackground=(image:ImageBitmap)=>run<Blob>('segment',image)
export const detectFace=(image:ImageBitmap)=>run<FaceBox[]>('face',image)
