import { FaceDetector, FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision'

const wasmRoot = '/wasm'
let filesetPromise: ReturnType<typeof FilesetResolver.forVisionTasks> | undefined
let segmenterPromise: Promise<ImageSegmenter> | undefined
let detectorPromise: Promise<FaceDetector> | undefined
const fileset = () => filesetPromise ??= FilesetResolver.forVisionTasks(wasmRoot)

export const initSegmenter = () => segmenterPromise ??= fileset().then(vision => ImageSegmenter.createFromOptions(vision, {
  canvas: typeof document === 'undefined' ? new OffscreenCanvas(1, 1) : undefined,
  baseOptions: { modelAssetPath: '/models/selfie_segmenter.tflite', delegate: 'CPU' }, runningMode: 'IMAGE', outputCategoryMask: true, outputConfidenceMasks: false
})).catch(error=>{segmenterPromise=undefined;filesetPromise=undefined;throw error})

export const initFaceDetector = () => detectorPromise ??= fileset().then(vision => FaceDetector.createFromOptions(vision, {
  canvas: typeof document === 'undefined' ? new OffscreenCanvas(1, 1) : undefined,
  baseOptions: { modelAssetPath: '/models/blaze_face_short_range.tflite', delegate: 'CPU' }, runningMode: 'IMAGE', minDetectionConfidence: .55
})).catch(error=>{detectorPromise=undefined;filesetPromise=undefined;throw error})

export async function removeBackground(image: ImageBitmap): Promise<Blob> {
  const segmenter = await initSegmenter()
  return new Promise((resolve, reject) => segmenter.segment(image, result => {
    try {
      const mask = result.categoryMask
      if (!mask) throw new Error('The model returned no person mask.')
      const mw = mask.width, mh = mask.height, values = mask.getAsUint8Array()
      const maskCanvas = new OffscreenCanvas(mw, mh), maskCtx = maskCanvas.getContext('2d')
      if (!maskCtx) throw new Error('Canvas processing is unavailable.')
      const maskImage = maskCtx.createImageData(mw, mh)
      for (let i = 0; i < values.length; i++) { const a = values[i] === 0 ? 0 : 255; maskImage.data.set([255, 255, 255, a], i * 4) }
      maskCtx.putImageData(maskImage, 0, 0)
      const output = new OffscreenCanvas(image.width, image.height), ctx = output.getContext('2d')
      if (!ctx) throw new Error('Canvas processing is unavailable.')
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, image.width, image.height)
      const person = new OffscreenCanvas(image.width, image.height), pctx = person.getContext('2d')
      if (!pctx) throw new Error('Canvas processing is unavailable.')
      pctx.drawImage(image, 0, 0); pctx.globalCompositeOperation = 'destination-in'; pctx.imageSmoothingEnabled = true; pctx.drawImage(maskCanvas, 0, 0, image.width, image.height)
      ctx.drawImage(person, 0, 0)
      output.convertToBlob({ type: 'image/png' }).then(resolve, reject)
      mask.close(); result.close()
    } catch (error) { reject(error) }
  }))
}

export async function detectFace(image: ImageBitmap) {
  const detector = await initFaceDetector()
  const detections = detector.detect(image).detections
  return detections.map(d => d.boundingBox).filter(b => b !== undefined)
}
