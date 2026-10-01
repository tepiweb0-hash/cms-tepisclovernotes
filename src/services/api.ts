import { auth } from '../firebase/client'
import type { CmsBootstrap, CmsRecord } from '../types/cms'

const configured = String(import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '')
const API_ROOT = configured.endsWith('/api') ? configured : `${configured}/api`

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await auth.currentUser?.getIdToken()
  const response = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(String((body as { error?: string })?.error || `Request failed (${response.status})`))
  }
  return body as T
}

export type MediaSignature = {
  cloudName: string
  apiKey: string
  timestamp: number
  uploadPreset: string
  signature: string
  uploadUrl: string
}

export const api = {
  bootstrap: () => request<CmsBootstrap>('/bootstrap'),
  list: (collection: string) => request<CmsRecord[]>(`/content/${collection}`),
  create: (collection: string, record: CmsRecord) => request<CmsRecord>(`/content/${collection}`, { method: 'POST', body: JSON.stringify(record) }),
  update: (collection: string, id: string, record: CmsRecord) => request<CmsRecord>(`/content/${collection}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(record) }),
  archive: (collection: string, id: string) => request<{ ok: true; id: string }>(`/content/${collection}/${encodeURIComponent(id)}/archive`, { method: 'POST' }),
  mediaSignature: () => request<MediaSignature>('/media/signature', { method: 'POST', body: '{}' }),
  registerMedia: (record: CmsRecord) => request<CmsRecord>('/media/register', { method: 'POST', body: JSON.stringify(record) }),
}
