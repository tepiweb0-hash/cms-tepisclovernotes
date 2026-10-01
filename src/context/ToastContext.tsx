import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { ToastKind } from '../types/cms'

type ToastItem = { id:string; kind:ToastKind; title:string; detail?:string; createdAt:number }
type ToastApi = { push:(kind:ToastKind,title:string,detail?:string)=>void; dismiss:(id:string)=>void; history:ToastItem[] }

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }:{ children:ReactNode }){
  const [items,setItems] = useState<ToastItem[]>([])
  const [history,setHistory] = useState<ToastItem[]>([])

  function dismiss(id:string){ setItems((current)=>current.filter((item)=>item.id!==id)) }
  function push(kind:ToastKind,title:string,detail?:string){
    const item={ id:crypto.randomUUID(),kind,title,detail,createdAt:Date.now() }
    setItems((current)=>[...current,item])
    setHistory((current)=>[item,...current].slice(0,30))
    window.setTimeout(()=>dismiss(item.id), kind==='error' ? 8000 : 4200)
  }

  const value=useMemo(()=>({push,dismiss,history}),[history])
  return <ToastContext.Provider value={value}>
    {children}
    <div className="toast-stack" aria-live="polite">
      {items.map((item)=><button key={item.id} className={`toast toast-${item.kind}`} onClick={()=>dismiss(item.id)}>
        <strong>{item.kind==='success'?'✓ ':item.kind==='error'?'✕ ':item.kind==='warning'?'⚠ ':'ⓘ '}{item.title}</strong>
        {item.detail && <span>{item.detail}</span>}
      </button>)}
    </div>
  </ToastContext.Provider>
}

export function useToast(){
  const value=useContext(ToastContext)
  if(!value) throw new Error('useToast must be used inside ToastProvider')
  return value
}
