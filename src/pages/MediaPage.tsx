import { UploadManager } from '../components/media/UploadManager'
import { NotificationCenter } from '../components/notifications/NotificationCenter'
import { PageSkeleton } from '../components/loaders/PageSkeleton'
import { useCmsData } from '../context/CmsDataContext'
import { CollectionPanel } from '../components/content/CollectionPanel'

export function MediaPage(){
  const {loading,error,refresh}=useCmsData()
  return <>
    <header className="topbar"><div><p className="eyebrow">Media</p><h2>Media Library</h2><p className="top-description">Upload images, then edit titles, alt text, status and metadata from the same page.</p></div><NotificationCenter/></header>
    {loading?<PageSkeleton/>:error?<section className="panel error-state"><h3>Unable to load media</h3><p>{error}</p><button className="primary" onClick={()=>void refresh()}>Retry</button></section>:<>
      <UploadManager/>
      <section className="panel content-shell"><CollectionPanel collectionKey="media"/></section>
    </>}
  </>
}
