import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/client'
import { navGroups } from '../config/navigation'
import { useToast } from '../context/ToastContext'
import { useCmsData } from '../context/CmsDataContext'
import { ButtonSpinner } from '../components/loaders/ButtonSpinner'
import { useState } from 'react'

export function CmsLayout(){
  const navigate=useNavigate(),toast=useToast(),{refresh,collection}=useCmsData();const [refreshing,setRefreshing]=useState(false)
  const uid=auth.currentUser?.uid
  const profile=collection('cms_users').find((row)=>String(row.id||row.user_id||'')===String(uid||''))
  const role=String(profile?.role||'cms user')
  async function logout(){try{await signOut(auth);navigate('/login')}catch(e){toast.push('error','Sign out failed',e instanceof Error?e.message:undefined)}}
  async function reload(){setRefreshing(true);try{await refresh();toast.push('success','Data refreshed')}finally{setRefreshing(false)}}
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><div className="clover">✦</div><div><strong>Tepis Clover Notes</strong><span>CMS · {role}</span></div></div><nav>{navGroups.map((group)=><section className="nav-group" key={group.title}><p>{group.title}</p>{group.items.map(([to,label])=><NavLink key={to} to={to}>{label}</NavLink>)}</section>)}</nav><button className="side-action" onClick={()=>void reload()} disabled={refreshing}>{refreshing&&<ButtonSpinner/>}{refreshing?'Refreshing…':'↻ Refresh data'}</button><button className="side-action danger-side" onClick={()=>void logout()}>Sign out</button></aside><main className="workspace"><Outlet/></main></div>
}
