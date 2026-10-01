import { UploadManager } from '../components/media/UploadManager'
import { NotificationCenter } from '../components/notifications/NotificationCenter'
import { PageSkeleton } from '../components/loaders/PageSkeleton'
import { useCmsData } from '../context/CmsDataContext'

export function MediaPage(){
  const {collection,loading}=useCmsData();const rows=collection('media')
  return <><header className="topbar"><div><p className="eyebrow">Media</p><h2>Media Library</h2><p className="top-description">Upload once, then reuse the Media ID across Artists, Series, Episodes, News and Events.</p></div><NotificationCenter/></header>{loading?<PageSkeleton/>:<><UploadManager/><section className="panel media-library"><div className="section-title"><div><h3>Library</h3><span>{rows.length} item{rows.length===1?'':'s'}</span></div></div><div className="media-grid">{rows.length?rows.map((m)=><article className="media-card" key={String(m.id||m.media_id)}><div className="media-thumb">{m.url?<img src={String(m.url)} alt={String(m.alt_text||m.title||'Media')} loading="lazy"/>:<div>✦</div>}</div><div className="media-body"><strong>{String(m.title||m.media_id||'Untitled')}</strong><span>{String(m.status||'')} · {String(m.format||m.mime_type||'image')}</span><code>{String(m.media_id||m.id||'')}</code></div></article>):<div className="empty-state"><strong>No media yet</strong><span>Upload your first image above.</span></div>}</div></section></>}</>
}
