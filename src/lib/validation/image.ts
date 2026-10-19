const signatures = {
  jpeg: (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png: (b: Uint8Array) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  webp: (b: Uint8Array) => String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP'
}
export async function validateImage(file: File) {
  if (file.size > 25 * 1024 * 1024) throw new Error('That file is over 25 MB. Choose a smaller JPEG, PNG, or WebP image.')
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (!Object.values(signatures).some(test => test(bytes))) throw new Error('Unsupported image. Use JPEG, PNG, or WebP; HEIC is not supported yet.')
}
