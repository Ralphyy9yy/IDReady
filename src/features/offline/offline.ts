export const REQUIRED_ASSETS = [
  '/models/selfie_segmenter.tflite', '/models/blaze_face_short_range.tflite',
  '/wasm/vision_wasm_internal.js', '/wasm/vision_wasm_internal.wasm',
  '/wasm/vision_wasm_module_internal.js', '/wasm/vision_wasm_module_internal.wasm',
  '/wasm/vision_wasm_nosimd_internal.js', '/wasm/vision_wasm_nosimd_internal.wasm'
]
const CACHE = 'idready-ai-v1'
export async function checkAiAssets() {
  if (!('caches' in window)) return false
  const cache = await caches.open(CACHE)
  return (await Promise.all(REQUIRED_ASSETS.map(a => cache.match(a)))).every(Boolean)
}
export async function downloadAiAssets(onProgress: (done: number, total: number) => void) {
  const cache = await caches.open(CACHE); let done = 0
  for (const path of REQUIRED_ASSETS) {
    const response = await fetch(path, { cache: 'no-store' })
    if (!response.ok) throw new Error(`Could not download ${path}.`)
    await cache.put(path, response); done++; onProgress(done, REQUIRED_ASSETS.length)
  }
  return checkAiAssets()
}
export async function removeAiAssets() { await caches.delete(CACHE) }
