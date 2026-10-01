import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type ToastKind = 'success' | 'error' | 'warning' | 'info'
type ToastItem = { id: string; kind: ToastKind; title: string; message?: string }
type ToastApi = { push: (kind: ToastKind, title: string, message?: string) => void }

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((kind: ToastKind, title: string, message?: string) => {
    const id = crypto.randomUUID()
    setItems((current) => [...current, { id, kind, title, message }])
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), kind === 'error' ? 7000 : 3500)
  }, [])
  const value = useMemo(() => ({ push }), [push])
  return <ToastContext.Provider value={value}>{children}<div className="toast-stack">{items.map((item) => <div className={`toast toast-${item.kind}`} key={item.id}><strong>{item.kind === 'success' ? '✓' : item.kind === 'error' ? '!' : 'ℹ'} {item.title}</strong>{item.message && <span>{item.message}</span>}</div>)}</div></ToastContext.Provider>
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
