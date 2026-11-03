import { useEffect } from 'react'

interface ClipboardImageOptions {
  dialogOpen: boolean
  busy: boolean
  onImage: (file: File) => Promise<void>
  onBusy: () => void
}

/** Import pasted images without taking over text fields or modal dialogs. */
export function useClipboardImage({ dialogOpen, busy, onImage, onBusy }: ClipboardImageOptions) {
  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      const target = event.target
      if (
        target instanceof Element &&
        target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])')
      )
        return
      if (dialogOpen || document.querySelector('[role="dialog"],dialog[open]')) return
      const file =
        Array.from(event.clipboardData?.items ?? [])
          .find((item) => item.kind === 'file' && item.type.startsWith('image/'))
          ?.getAsFile() ??
        Array.from(event.clipboardData?.files ?? []).find((file) => file.type.startsWith('image/'))
      if (!file) return
      event.preventDefault()
      if (busy) {
        onBusy()
        return
      }
      void onImage(file)
    }
    document.addEventListener('paste', paste)
    return () => document.removeEventListener('paste', paste)
  }, [dialogOpen, busy, onImage, onBusy])
}
