import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { PageSkeleton } from '../components/loaders/PageSkeleton'
import { useToast } from '../context/ToastContext'

export function DashboardPage() {
  const [data, setData] = useState<any>(null); const toast = useToast()
  useEffect(() => { api.bootstrap().then(setData).catch((e) => toast.push('error','Unable to load dashboard', e.message)) }, [])
  if (!data) return <><header className="topbar"><div><p className="eyebrow">CMS</p><h2>Dashboard</h2></div></header><PageSkeleton /></>
  const count=(name:string)=>data.collections?.[name]?.length ?? 0
  return <><header className="topbar"><div><p className="eyebrow">CMS</p><h2>Dashboard</h2></div><div className="top-actions">🔔</div></header><section className="panel"><div className="stats-grid">{[['Artists',count('artists')],['Series',count('series')],['Episodes',count('episodes')],['News',count('news')],['Events',count('events')],['Media',count('media')],['Pages',count('pages')],['Notifications',count('notifications')]].map(([label,value])=><div className="stat" key={label}><strong>{value}</strong><span>{label}</span></div>)}</div><div className="dashboard-note"><p className="eyebrow">Easy editing mode</p><h3>Edit the website by page, not by raw database tables.</h3><p>The new CMS keeps the simple workflow from your Apps Script version, while Firebase handles the data.</p></div></section></>
}
