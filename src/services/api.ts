import { auth } from '../firebase/client'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await auth.currentUser?.getIdToken()
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`)
  return body as T
}

export const api = {
  bootstrap: () => request<any>('/bootstrap'),
  list: (collection: string) => request<any[]>(`/content/${collection}`),
  create: (collection: string, record: Record<string, unknown>) => request<any>(`/content/${collection}`, { method: 'POST', body: JSON.stringify(record) }),
  update: (collection: string, id: string, record: Record<string, unknown>) => request<any>(`/content/${collection}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(record) }),
  archive: (collection: string, id: string) => request<any>(`/content/${collection}/${encodeURIComponent(id)}/archive`, { method: 'POST' }),
  registerMedia: (record: Record<string, unknown>) => request<any>('/media/register', { method: 'POST', body: JSON.stringify(record) }),
}
