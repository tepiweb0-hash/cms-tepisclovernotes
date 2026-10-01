import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/client'
import { navGroups } from '../config/navigation'
import { useToast } from '../context/ToastContext'
import { useCmsData } from '../context/CmsDataContext'
import { ButtonSpinner } from '../components/loaders/ButtonSpinner'
import { useMemo, useState } from 'react'

export function CmsLayout(){
  const navigate=useNavigate(),toast=useToast(),{refresh,collection}=useCmsData()
  const [refreshing,setRefreshing]=useState(false)
  const [navQuery,setNavQuery]=useState('')
  const uid=auth.currentUser?.uid
  const profile=collection('cms_users').find((row)=>String(row.id||row.user_id||'')===String(uid||''))
  const role=String(profile?.role||'cms user')
  const publicUrl=(import.meta.env.VITE_PUBLIC_SITE_URL||'https://tepisclovernotes.vercel.app').replace(/\/$/,'')

  const filteredGroups=useMemo(()=>{
    const q=navQuery.trim().toLowerCase()
    return navGroups.map((group)=>({...group,items:group.items.filter(([to,label])=>{
      if((to==='/users'||to==='/migration')&&role!=='owner') return false
      return label.toLowerCase().includes(q)
    })})).filter((group)=>group.items.length)
  },[navQuery,role])

  async function logout(){
    try{await signOut(auth);navigate('/login')}
    catch(e){toast.push('error','Sign out failed',e instanceof Error?e.message:undefined)}
  }
  async function reload(){
    setRefreshing(true)
    try{await refresh();toast.push('success','Data refreshed')}
    finally{setRefreshing(false)}
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="clover">✦</div><div><strong>Tepis Clover Notes</strong><span>CMS · {role}</span></div></div>
      <div className="sidebar-search"><span>⌕</span><input aria-label="Search navigation" placeholder="Find a section…" value={navQuery} onChange={(e)=>setNavQuery(e.target.value)}/>{navQuery&&<button onClick={()=>setNavQuery('')} aria-label="Clear navigation search">×</button>}</div>
      <nav>{filteredGroups.map((group)=><section className="nav-group" key={group.title}><p>{group.title}</p>{group.items.map(([to,label,icon])=><NavLink key={to} to={to}><span className="nav-icon">{icon}</span><span>{label}</span></NavLink>)}</section>)}{!filteredGroups.length&&<div className="nav-empty">No section found.</div>}</nav>
      <a className="side-action public-site-link" href={publicUrl} target="_blank" rel="noreferrer">↗ View public site</a>
      <button className="side-action" onClick={()=>void reload()} disabled={refreshing}>{refreshing&&<ButtonSpinner/>}{refreshing?'Refreshing…':'↻ Refresh data'}</button>
      <button className="side-action danger-side" onClick={()=>void logout()}>Sign out</button>
    </aside>
    <main className="workspace"><Outlet/></main>
  </div>
}
