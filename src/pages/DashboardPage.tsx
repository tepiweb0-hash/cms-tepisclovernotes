import { Link } from 'react-router-dom'
import { useCmsData } from '../context/CmsDataContext'
import { PageSkeleton } from '../components/loaders/PageSkeleton'
import { NotificationCenter } from '../components/notifications/NotificationCenter'
import { auth } from '../firebase/client'

export function DashboardPage(){
  const {data,loading,error,refresh}=useCmsData()
  if(loading)return <><header className="topbar"><div><p className="eyebrow">CMS</p><h2>Dashboard</h2></div></header><PageSkeleton/></>
  if(error)return <section className="panel error-state"><h3>Unable to load dashboard</h3><p>{error}</p><button className="primary" onClick={()=>void refresh()}>Retry</button></section>
  const count=(name:string)=>data?.collections?.[name]?.length||0
  const uid=auth.currentUser?.uid||''
  const me=(data?.collections?.cms_users||[]).find((row)=>String(row.id||row.user_id||'')===uid)
  const isOwner=String(me?.role||'')==='owner'
  const cards=[
    ['Artists',count('artists'),'/artists'],['Series',count('series'),'/series'],['Episodes',count('episodes'),'/episodes'],['News',count('news'),'/news'],
    ['Events',count('events'),'/events'],['Media',count('media'),'/media'],['Pages',count('pages'),'/home'],['Notifications',count('notifications'),'/notifications']
  ] as const
  const quick=[
    ['+ Add artist','/artists?new=artists','Create a new artist profile'],
    ['+ Add series','/series?new=series','Create a series and connect cast'],
    ['+ Add episode','/episodes?new=episodes','Add the next episode'],
    ['+ Add news','/news?new=news','Publish a new story'],
    ['Upload media','/media','Add images to the media library'],
    ...(isOwner ? [['+ Add user','/users','Create a Firebase login and CMS role']] as const : []),
  ] as const

  return <>
    <header className="topbar"><div><p className="eyebrow">CMS</p><h2>Dashboard</h2><p className="top-description">Edit the website without touching Firebase directly.</p></div><NotificationCenter/></header>
    <section className="panel dashboard-home">
      <div className="dashboard-section-head"><div><p className="eyebrow">Quick actions</p><h3>What do you want to edit?</h3></div><span className="helper-badge">Changes save to Firestore</span></div>
      <div className="quick-actions">{quick.map(([label,to,detail])=><Link to={to} className="quick-action" key={to}><strong>{label}</strong><span>{detail}</span><b>→</b></Link>)}</div>

      <div className="dashboard-section-head content-count-head"><div><p className="eyebrow">Content overview</p><h3>Everything at a glance</h3></div></div>
      <div className="stats-grid">{cards.map(([label,value,to])=><Link className="stat stat-link" to={to} key={label}><strong>{value}</strong><span>{label}</span><small>Open →</small></Link>)}</div>

      <div className="dashboard-note"><p className="eyebrow">Easy editing mode</p><h3>Use the friendly pages first. Technical fields stay out of the way.</h3><p>Each content area now has search, filters, card/table views and a grouped editor. IDs and advanced fields are kept in an Advanced section so day-to-day edits are faster.</p></div>
      <div className="dashboard-checks"><div><b>✓</b><span>Firebase Authentication</span></div><div><b>✓</b><span>Firestore via Express API</span></div><div><b>✓</b><span>Cloudinary media uploads</span></div><div><b>✓</b><span>Migration & recovery tools</span></div></div>
    </section>
  </>
}
