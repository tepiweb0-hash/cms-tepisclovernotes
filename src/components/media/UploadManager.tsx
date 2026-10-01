import { useState } from 'react'
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'
import { storage } from '../../firebase/client'
import { api } from '../../services/api'
import { useToast } from '../../context/ToastContext'

type UploadItem = { id: string; name: string; progress: number; status: 'optimizing'|'uploading'|'saving'|'success'|'error'; error?: string }

async function toWebP(file: File) {
  const bitmap = await createImageBitmap(file)
  const max = 2200
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d', { alpha: true })!.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error('WebP conversion failed.')), 'image/webp', .84))
  return { blob, width, height }
}

export function UploadManager() {
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const toast = useToast()
  const patch = (id: string, next: Partial<UploadItem>) => setUploads((items) => items.map((item) => item.id === id ? { ...item, ...next } : item))

  async function uploadOne(file: File) {
    const id = crypto.randomUUID()
    setUploads((items) => [...items, { id, name: file.name, progress: 0, status: 'optimizing' }])
    try {
      const converted = await toWebP(file)
      patch(id, { status: 'uploading', progress: 2 })
      const clean = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]+/g, '-')
      const storagePath = `media/${Date.now()}-${clean}.webp`
      const task = uploadBytesResumable(ref(storage, storagePath), converted.blob, { contentType: 'image/webp' })
      await new Promise<void>((resolve, reject) => task.on('state_changed', (snapshot) => patch(id, { progress: Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100) }), reject, () => resolve()))
      patch(id, { status: 'saving', progress: 100 })
      const url = await getDownloadURL(task.snapshot.ref)
      await api.registerMedia({ media_id: `media-${id.slice(0, 8)}`, title: clean.replace(/[-_]+/g, ' '), storage_path: storagePath, url, alt_text: clean.replace(/[-_]+/g, ' '), mime_type: 'image/webp', width: converted.width, height: converted.height, bytes: converted.blob.size, is_webp: true, status: 'ready', uploaded_at: new Date().toISOString(), sort_order: 999, enabled: true })
      patch(id, { status: 'success' })
      toast.push('success', 'Upload successful', `${file.name} was added to Media Library.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed.'
      patch(id, { status: 'error', error: message })
      toast.push('error', 'Upload failed', `${file.name}: ${message}`)
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return
    for (const file of Array.from(files)) await uploadOne(file)
  }

  return <section className="upload-card"><div><p className="eyebrow">Media pipeline</p><h3>Upload → optimize WebP → Firebase Storage</h3><p>Actual upload progress is shown per image.</p></div><label className="primary upload-button">+ Upload images<input hidden type="file" accept="image/*" multiple onChange={(e) => { void onFiles(e.target.files); e.currentTarget.value = '' }} /></label>{uploads.length > 0 && <div className="upload-list">{uploads.map((item) => <div className="upload-row" key={item.id}><div><strong>{item.name}</strong><span>{item.status === 'optimizing' ? 'Optimizing…' : item.status === 'uploading' ? `Uploading ${item.progress}%` : item.status === 'saving' ? 'Saving media record…' : item.status === 'success' ? 'Upload successful' : `Upload failed${item.error ? ` — ${item.error}` : ''}`}</span></div><div className="progress"><span style={{ width: `${item.progress}%` }} /></div></div>)}</div>}</section>
}
