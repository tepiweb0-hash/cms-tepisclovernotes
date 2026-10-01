import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PAGE_CONFIG, COLLECTIONS } from '../config/collections'
import { CollectionPanel } from '../components/content/CollectionPanel'
import { PageSkeleton } from '../components/loaders/PageSkeleton'
import { useCmsData } from '../context/CmsDataContext'
import { NotificationCenter } from '../components/notifications/NotificationCenter'

export function ContentPage({page}:{page:keyof typeof PAGE_CONFIG}){
  const config=PAGE_CONFIG[page]
  const {loading,error,refresh,collection}=useCmsData()
  const [active,setActive]=useState<string>(config.collections[0])
  const [params,setParams]=useSearchParams()
  const requestedNew=params.get('new')

  useEffect(()=>{ setActive(config.collections[0]) },[page])
  useEffect(()=>{
    const keys=config.collections as readonly string[]
    if(requestedNew && keys.includes(requestedNew)) setActive(requestedNew)
  },[requestedNew,page])

  function clearNewRequest(){
    if(!requestedNew) return
    const next=new URLSearchParams(params);next.delete('new');setParams(next,{replace:true})
  }

  return <>
    <header className="topbar"><div><p className="eyebrow">{config.eyebrow}</p><h2>{config.title}</h2><p className="top-description">{config.description}</p></div><NotificationCenter/></header>
    {loading?<PageSkeleton/>:error?<section className="panel error-state"><h3>Unable to load CMS data</h3><p>{error}</p><button className="primary" onClick={()=>void refresh()}>Retry</button></section>:<section className="panel content-shell">
      {config.collections.length>1&&<div className="collection-switcher">{config.collections.map((key)=>{
        const meta=COLLECTIONS[key]
        const total=collection(key).length
        return <button key={key} className={active===key?'active':''} onClick={()=>setActive(key)}><span>{meta.label}</span><b>{total}</b></button>
      })}</div>}
      <CollectionPanel collectionKey={active} startNew={requestedNew===active} onStartNewHandled={clearNewRequest}/>
    </section>}
  </>
}
