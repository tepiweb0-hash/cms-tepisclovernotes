import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase/client'
import { navGroups } from '../config/navigation'
import { useToast } from '../context/ToastContext'

export function CmsLayout() {
  const navigate = useNavigate()
  const toast = useToast()
  async function logout() {
    try { await signOut(auth); navigate('/login') } catch (e) { toast.push('error', 'Sign out failed', e instanceof Error ? e.message : undefined) }
  }
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><div className="clover">✦</div><div><strong>Tepis Clover Notes</strong><span>CMS</span></div></div><nav>{navGroups.map((group) => <section className="nav-group" key={group.title}><p>{group.title}</p>{group.items.map(([to,label]) => <NavLink key={to} to={to}>{label}</NavLink>)}</section>)}</nav><button className="side-action" onClick={logout}>Sign out</button></aside><main className="workspace"><Outlet /></main></div>
}
