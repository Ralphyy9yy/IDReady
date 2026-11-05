import { FaceDetector, FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision'
import { refinePersonMask } from './matte'

const wasmRoot = '/wasm'
let filesetPromise: ReturnType<typeof FilesetResolver.forVisionTasks> | undefined
let segmenterPromise: Promise<ImageSegmenter> | undefined
let detectorPromise: Promise<FaceDetector> | undefined
const fileset = () => (filesetPromise ??= FilesetResolver.forVisionTasks(wasmRoot))

function processingCanvas(width: number, height: number) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height)
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
  }
  throw new Error('Canvas processing is unavailable.')
}

function pngBlob(canvas: OffscreenCanvas | HTMLCanvasElement): Promise<Blob> {
  if ('convertToBlob' in canvas) return canvas.convertToBlob({ type: 'image/png' })
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Could not encode the processed photo.'))
    }, 'image/png'),
  )
}

export const initSegmenter = () =>
  (segmenterPromise ??= fileset()
    .then((vision) =>
      ImageSegmenter.createFromOptions(vision, {
        canvas: typeof document === 'undefined' ? new OffscreenCanvas(1, 1) : undefined,
        baseOptions: { modelAssetPath: '/models/selfie_segmenter.tflite', delegate: 'CPU' },
        runningMode: 'IMAGE',
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      }),
    )
    .catch((error) => {
      segmenterPromise = undefined
      filesetPromise = undefined
      throw error
    }))

export const initFaceDetector = () =>
  (detectorPromise ??= fileset()
    .then((vision) =>
      FaceDetector.createFromOptions(vision, {
        canvas: typeof document === 'undefined' ? new OffscreenCanvas(1, 1) : undefined,
        baseOptions: { modelAssetPath: '/models/blaze_face_short_range.tflite', delegate: 'CPU' },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.55,
      }),
    )
    .catch((error) => {
      detectorPromise = undefined
      filesetPromise = undefined
      throw error
    }))

export async function removeBackground(image: ImageBitmap): Promise<Blob> {
  const segmenter = await initSegmenter()
  return new Promise((resolve, reject) =>
    segmenter.segment(image, (result) => {
      try {
        // SelfieSegmenter exposes background then person; single-channel variants expose person.
        const masks = result.confidenceMasks
        const mask = masks?.[1] ?? masks?.[0]
        if (!mask) throw new Error('The model returned no person mask.')
        const mw = mask.width,
          mh = mask.height,
          values = mask.getAsFloat32Array()
        const maskCanvas = processingCanvas(mw, mh),
          maskCtx = maskCanvas.getContext('2d')
        if (!maskCtx) throw new Error('Canvas processing is unavailable.')
        maskCtx.drawImage(image, 0, 0, mw, mh)
        const alpha = refinePersonMask(values, maskCtx.getImageData(0, 0, mw, mh).data, mw, mh)
        const maskImage = maskCtx.createImageData(mw, mh)
        for (let i = 0; i < values.length; i++) {
          const a = alpha[i]
          maskImage.data.set([255, 255, 255, a], i * 4)
        }
        maskCtx.putImageData(maskImage, 0, 0)
        const output = processingCanvas(image.width, image.height),
          ctx = output.getContext('2d')
        if (!ctx) throw new Error('Canvas processing is unavailable.')
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, image.width, image.height)
        const person = processingCanvas(image.width, image.height),
          pctx = person.getContext('2d')
        if (!pctx) throw new Error('Canvas processing is unavailable.')
        pctx.drawImage(image, 0, 0)
        pctx.globalCompositeOperation = 'destination-in'
        pctx.imageSmoothingEnabled = true
        pctx.drawImage(maskCanvas, 0, 0, image.width, image.height)
        ctx.drawImage(person, 0, 0)
        pngBlob(output).then(resolve, reject)
      } catch (error) {
        reject(error)
      } finally {
        result.close()
      }
    }),
  )
}

export async function detectFace(image: ImageBitmap) {
  const detector = await initFaceDetector()
  const detections = detector.detect(image).detections
  return detections.map((d) => d.boundingBox).filter((b) => b !== undefined)
}
