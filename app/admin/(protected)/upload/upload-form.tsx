'use client'

import { useActionState, useEffect, useRef, useState, startTransition } from 'react'
import { uploadPhotos, type UploadPhotosState } from './actions'
import { validateImageFile, deriveTitleFromFilename, MAX_BATCH_SIZE } from '@/lib/cloudinary/validation'
import type { Category } from '@/types/database'

type PendingFile = {
  file: File
  previewUrl: string
  title: string
}

const initialState: UploadPhotosState = {
  success: false,
  insertedCount: 0,
  failed: [],
  message: '',
}

export function UploadForm({ categories }: { categories: Category[] }) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [localError, setLocalError] = useState<string | null>(null)
  const [state, formAction, isPending] = useActionState(uploadPhotos, initialState)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      pendingFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (state.success && state.failed.length === 0) {
      pendingFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl))
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting the form after a successful upload, not syncing derived state
      setPendingFiles([])
      if (inputRef.current) inputRef.current.value = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList)
    setLocalError(null)

    if (pendingFiles.length + incoming.length > MAX_BATCH_SIZE) {
      setLocalError(`Máximo ${MAX_BATCH_SIZE} fotos por lote.`)
      return
    }

    const next: PendingFile[] = []
    for (const file of incoming) {
      const error = validateImageFile(file)
      if (error) {
        setLocalError(`${file.name}: ${error}`)
        continue
      }
      next.push({
        file,
        previewUrl: URL.createObjectURL(file),
        title: deriveTitleFromFilename(file.name),
      })
    }
    setPendingFiles((prev) => [...prev, ...next])
  }

  function removeFile(index: number) {
    setPendingFiles((prev) => {
      const removed = prev[index]
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  function updateTitle(index: number, title: string) {
    setPendingFiles((prev) => prev.map((f, i) => (i === index ? { ...f, title } : f)))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pendingFiles.length === 0) {
      setLocalError('Seleccioná al menos una foto.')
      return
    }
    if (!categoryId) {
      setLocalError('Seleccioná una categoría.')
      return
    }
    const formData = new FormData()
    formData.set('categoryId', categoryId)
    pendingFiles.forEach((f, i) => {
      formData.append('files', f.file)
      formData.set(`title-${i}`, f.title)
    })
    startTransition(() => {
      formAction(formData)
    })
  }

  if (categories.length === 0) {
    return (
      <p className="text-zinc-400">
        No hay categorías creadas. Creá al menos una desde el dashboard de Supabase antes de subir fotos.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          addFiles(e.dataTransfer.files)
        }}
        className="border border-dashed border-zinc-700 rounded-xl p-8 text-center cursor-pointer hover:border-zinc-500 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <p className="text-sm text-zinc-400">
          Arrastrá fotos acá o hacé click para elegir (máximo {MAX_BATCH_SIZE})
        </p>
      </div>

      {localError && <p className="text-sm text-red-400">{localError}</p>}

      {pendingFiles.length > 0 && (
        <div className="space-y-1">
          <label htmlFor="categoryId" className="text-sm text-zinc-400">
            Categoría (para todo el lote)
          </label>
          <select
            id="categoryId"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-zinc-50 text-sm"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {pendingFiles.map((f, i) => (
          <div key={f.previewUrl} className="space-y-2">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.previewUrl} alt={f.title} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute top-1 right-1 bg-black/60 text-white text-xs rounded-full w-6 h-6"
              >
                ×
              </button>
            </div>
            <input
              type="text"
              value={f.title}
              onChange={(e) => updateTitle(i, e.target.value)}
              placeholder="Título"
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1 text-zinc-50 text-xs"
            />
          </div>
        ))}
      </div>

      {pendingFiles.length > 0 && (
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-zinc-50 text-zinc-950 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Subiendo...' : `Subir ${pendingFiles.length} foto(s)`}
        </button>
      )}

      {state.message && (
        <div className="space-y-1">
          <p className={`text-sm ${state.success ? 'text-emerald-400' : 'text-red-400'}`}>{state.message}</p>
          {state.failed.length > 0 && (
            <ul className="text-xs text-red-400 list-disc list-inside">
              {state.failed.map((f, i) => (
                <li key={i}>
                  {f.filename}: {f.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  )
}
