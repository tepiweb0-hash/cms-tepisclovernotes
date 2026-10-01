import { useCmsData } from '../context/CmsDataContext'
import { PageSkeleton } from '../components/loaders/PageSkeleton'
import { NotificationCenter } from '../components/notifications/NotificationCenter'

export function DashboardPage(){
  const {data,loading,error,refresh}=useCmsData()
  if(loading)return <><header className="topbar"><div><p className="eyebrow">CMS</p><h2>Dashboard</h2></div></header><PageSkeleton/></>
  if(error)return <section className="panel error-state"><h3>Unable to load dashboard</h3><p>{error}</p><button className="primary" onClick={()=>void refresh()}>Retry</button></section>
  const count=(name:string)=>data?.collections?.[name]?.length||0
  const cards=[['Artists',count('artists')],['Series',count('series')],['Episodes',count('episodes')],['News',count('news')],['Events',count('events')],['Media',count('media')],['Pages',count('pages')],['Notifications',count('notifications')]] as const
  return <><header className="topbar"><div><p className="eyebrow">CMS</p><h2>Dashboard</h2><p className="top-description">Tepis Clover Notes content management system.</p></div><NotificationCenter/></header><section className="panel"><div className="stats-grid">{cards.map(([label,value])=><div className="stat" key={label}><strong>{value}</strong><span>{label}</span></div>)}</div><div className="dashboard-note"><p className="eyebrow">Easy editing mode</p><h3>Edit the site page-by-page instead of working directly inside Firebase.</h3><p>Use Artists, Series, Episodes, Events, News and Media on the left. Saves, uploads and failures always show clear feedback.</p></div><div className="dashboard-checks"><div><b>✓</b><span>Firebase Authentication</span></div><div><b>✓</b><span>Firestore via Express API</span></div><div><b>✓</b><span>Cloudinary media uploads</span></div><div><b>✓</b><span>Loaders, progress and notifications</span></div></div></section></>
}
