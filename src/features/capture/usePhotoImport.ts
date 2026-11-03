import type { RefObject } from 'react'
import { validateImage } from '../../lib/validation/image'

interface PhotoImportOptions {
  input: RefObject<HTMLInputElement | null>
  onLoad: (photo: Blob) => Promise<void>
  onError: (message: string) => void
}

/** Share validation and file-input cleanup across upload, drop and paste. */
export function usePhotoImport({ input, onLoad, onError }: PhotoImportOptions) {
  return async (file?: File) => {
    if (!file) return
    try {
      await validateImage(file)
      await onLoad(file)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Invalid image.')
    } finally {
      if (input.current) input.current.value = ''
    }
  }
}
