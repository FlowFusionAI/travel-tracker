// components/trips/CoverImageUpload.tsx
'use client'

import { useState, useRef, useCallback } from 'react'
import imageCompression from 'browser-image-compression'

interface CoverImageUploadProps {
  recordId: string
  hasExisting: boolean   // true if Cover Image attachment already exists
  onUploadComplete: () => void   // called after successful upload (parent can re-fetch)
  onRemove: () => void           // called when user clicks remove button
}

const pixelFont = { fontFamily: 'var(--font-pixel)' }

export default function CoverImageUpload({
  recordId,
  hasExisting,
  onUploadComplete,
  onRemove,
}: CoverImageUploadProps) {
  const [status, setStatus] = useState<'idle' | 'compressing' | 'uploading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const cacheBuster = useRef(Date.now())

  const imageUrl = hasExisting
    ? `/api/images?recordId=${recordId}&table=Trips&field=Cover+Image&t=${cacheBuster.current}`
    : null

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select an image file.')
      setStatus('error')
      return
    }

    setStatus('compressing')
    setErrorMsg('')

    let compressed: File
    try {
      compressed = await imageCompression(file, {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1024,
        fileType: 'image/jpeg',
        useWebWorker: true,
      })
    } catch {
      setErrorMsg('Image compression failed.')
      setStatus('error')
      return
    }

    // Show local preview immediately after compression
    const preview = URL.createObjectURL(compressed)
    setLocalPreview(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return preview
    })
    setStatus('uploading')

    const formData = new FormData()
    formData.append('file', compressed, 'cover.jpg')

    try {
      const res = await fetch(
        `/api/airtable/upload?recordId=${recordId}&field=Cover+Image`,
        { method: 'POST', body: formData }
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Upload failed')
      }
      cacheBuster.current = Date.now()
      setStatus('idle')
      onUploadComplete()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed')
      setStatus('error')
    }
  }, [recordId, onUploadComplete])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset input so the same file can be re-selected if needed
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const displayUrl = localPreview ?? imageUrl

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[7px] text-slate-500" style={pixelFont}>COVER IMAGE</p>

      {/* Preview + drop zone */}
      <div
        className="relative border-2 border-dashed border-slate-700 hover:border-teal-700 transition-colors cursor-pointer"
        style={{ minHeight: 120, maxWidth: 300 }}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="Cover"
            className="w-full object-cover"
            style={{ maxHeight: 180 }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-[120px] gap-2">
            <p className="text-[8px] text-slate-600" style={pixelFont}>
              DROP IMAGE HERE
            </p>
            <p className="text-[7px] text-slate-700" style={pixelFont}>
              OR CLICK TO BROWSE
            </p>
          </div>
        )}

        {/* Loading overlay */}
        {(status === 'compressing' || status === 'uploading') && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70">
            <p className="text-[8px] text-teal-400" style={pixelFont}>
              {status === 'compressing' ? 'COMPRESSING...' : 'UPLOADING...'}
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {status === 'error' && (
        <p className="text-[7px] text-red-400" style={pixelFont}>{errorMsg}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={status === 'compressing' || status === 'uploading'}
          className="text-[7px] px-2 py-1 border border-teal-800 text-teal-400 hover:bg-teal-900/30 disabled:opacity-40 transition-colors"
          style={pixelFont}
        >
          {hasExisting || localPreview ? 'CHANGE' : '+ ADD IMAGE'}
        </button>

        {(hasExisting || localPreview) && (
          <button
            type="button"
            onClick={() => {
              setLocalPreview(null)
              onRemove()
            }}
            className="text-[7px] px-2 py-1 border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-900 transition-colors"
            style={pixelFont}
          >
            ✕ REMOVE
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  )
}
