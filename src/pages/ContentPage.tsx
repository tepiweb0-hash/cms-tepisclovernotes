import { useState } from 'react'
import { PAGE_CONFIG, COLLECTIONS } from '../config/collections'
import { CollectionPanel } from '../components/content/CollectionPanel'
import { PageSkeleton } from '../components/loaders/PageSkeleton'
import { useCmsData } from '../context/CmsDataContext'
import { NotificationCenter } from '../components/notifications/NotificationCenter'

export function ContentPage({page}:{page:keyof typeof PAGE_CONFIG}){
  const config=PAGE_CONFIG[page]
  const {loading,error,refresh}=useCmsData()
  const [active,setActive]=useState<string>(config.collections[0])
  return <>
    <header className="topbar"><div><p className="eyebrow">{config.eyebrow}</p><h2>{config.title}</h2><p className="top-description">{config.description}</p></div><NotificationCenter/></header>
    {loading?<PageSkeleton/>:error?<section className="panel error-state"><h3>Unable to load CMS data</h3><p>{error}</p><button className="primary" onClick={()=>void refresh()}>Retry</button></section>:<section className="panel content-shell"><div className="tab-row">{config.collections.map((key)=><button key={key} className={active===key?'active':''} onClick={()=>setActive(key)}>{COLLECTIONS[key].label}</button>)}</div><CollectionPanel collectionKey={active}/></section>}
  </>
}
