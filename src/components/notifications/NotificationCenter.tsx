import { useState } from 'react'
import { useToast } from '../../context/ToastContext'

export function NotificationCenter(){
  const [open,setOpen]=useState(false)
  const {history}=useToast()
  return <div className="notification-center"><button className="icon-action" onClick={()=>setOpen((v)=>!v)} aria-label="CMS notifications">🔔{history.length>0&&<b>{Math.min(history.length,9)}</b>}</button>{open&&<div className="notification-popover"><div className="notification-head"><strong>Recent activity</strong><button onClick={()=>setOpen(false)}>×</button></div>{history.length?history.slice(0,8).map((item)=><div className={`notice notice-${item.kind}`} key={item.id}><strong>{item.title}</strong>{item.detail&&<span>{item.detail}</span>}<small>{new Date(item.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small></div>):<p className="empty">No recent activity yet.</p>}</div>}</div>
}
