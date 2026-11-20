import { useEffect, useRef, useState } from 'react'
import { Download, Upload, Trash2 } from 'lucide-react'
import { exportDraftBackup, importDraftBackup } from './backup'
import { saveDraft } from '../../services/storage/db'
import type { StoredDraft } from '../../types'

export function DraftGallery({
  drafts,
  onResume,
  onDelete,
  onImported,
}: {
  drafts: StoredDraft[]
  onResume: (id: string) => void
  onDelete: (id: string) => void
  onImported: () => Promise<void>
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await action()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not process the backup. Your existing drafts are unchanged.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="draft-gallery">
      <h2>Saved on this device</h2>
      <p>
        Back up editable photos and sheets to a file. Backups contain your original photos and
        personal name tags; store and share them carefully.
      </p>
      <button
        className="button secondary"
        disabled={busy}
        onClick={() => fileInput.current?.click()}
      >
        <Upload />
        Import draft backup
      </button>
      <input
        ref={fileInput}
        type="file"
        hidden
        accept=".idready,application/json"
        aria-label="Import IDReady backup file"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file || busy) return
          void run(async () => {
            const draft = await importDraftBackup(file)
            if (
              !window.confirm(
                `Import “${draft.name}” as a new draft on this device? Existing drafts will not be replaced.`,
              )
            )
              return
            await saveDraft(draft)
            await onImported()
            setMessage('Backup imported as a new draft. Select Resume to open it.')
          })
        }}
      />
      {!drafts.length && (
        <p>No saved drafts yet. Import a backup or save a photo to get started.</p>
      )}
      {busy && <p role="status">Preparing backup…</p>}
      {message && <p role="status">{message}</p>}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <div className="draft-list">
        {drafts.map((draft) => (
          <article className="draft-item" key={draft.id}>
            <Thumbnail blob={draft.thumbnail ?? draft.processed ?? draft.photo} />
            <div>
              <strong>{draft.name ?? 'Saved photo'}</strong>
              {draft.sheet && <p>Sheet draft · {draft.sheet.photos.length} photos</p>}
              <p>
                {new Date(draft.updatedAt ?? draft.createdAt).toLocaleString()} · {draft.size.label}
              </p>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => onResume(draft.id)}
              >
                Resume
              </button>
              <button
                className="button quiet"
                disabled={busy}
                aria-label={`Download backup for ${draft.name ?? 'saved photo'}`}
                onClick={() =>
                  void run(async () => {
                    const blob = await exportDraftBackup(draft),
                      url = URL.createObjectURL(blob)
                    const link = document.createElement('a')
                    link.href = url
                    link.download = `IDReady-${(draft.name ?? 'draft').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60)}.idready`
                    link.click()
                    setTimeout(() => URL.revokeObjectURL(url), 1000)
                    setMessage('Backup downloaded. Keep this file safe; it contains your photos.')
                  })
                }
              >
                <Download />
                Backup
              </button>
            </div>
            <button
              className="icon-button"
              disabled={busy}
              aria-label={`Delete ${draft.name ?? 'saved photo'}`}
              onClick={() => onDelete(draft.id)}
            >
              <Trash2 />
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
function Thumbnail({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    const next = URL.createObjectURL(blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob])
  return <img src={url || undefined} alt="Saved photo thumbnail" />
}
