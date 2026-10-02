import { useEffect, useMemo, useState } from 'react'
import { COLLECTIONS, labelize } from '../../config/collections'
import { useCmsData } from '../../context/CmsDataContext'
import { api } from '../../services/api'
import type { CmsRecord } from '../../types/cms'
import { useToast } from '../../context/ToastContext'
import { RecordEditor } from './RecordEditor'
import { BusyOverlay } from '../loaders/BusyOverlay'
import { auth } from '../../firebase/client'

const CARD_COLLECTIONS=new Set(['artists','series','episodes','events','news','notifications','pages'])
const GROUP_BY_SERIES=new Set(['artists','episodes'])
type SaveIntent='draft'|'publish'|'save'

function view(value:unknown){
  if(typeof value==='boolean') return value?'Yes':'No'
  if(value===null||value===undefined||value==='') return '—'
  const s=typeof value==='object'?JSON.stringify(value):String(value)
  return s.length>86?`${s.slice(0,83)}…`:s
}
function titleFor(row:CmsRecord){
  return String(row.title||row.display_name||row.label||row.full_name||row.key||row.name||row.id||'Untitled')
}
function subtitleFor(row:CmsRecord){
  const candidates=[row.full_name,row.native_title,row.excerpt,row.short_info,row.description,row.slug,row.email]
  const t=titleFor(row)
  return String(candidates.find((v)=>v&&String(v)!==t)||'')
}
function recordDate(row:CmsRecord){
  return String(row.updated_at||row.publish_date||row.published_at||row.release_date||row.start_date||row.created_at||'')
}
function enabled(row:CmsRecord){ return row.enabled===undefined ? true : row.enabled===true || String(row.enabled).toLowerCase()==='true' || String(row.enabled)==='1' }
function publicationState(row:CmsRecord){
  const explicit=String(row.publication_status||'').toLowerCase()
  if(['published','draft','archived'].includes(explicit)) return explicit
  const legacy=String(row.status||'').toLowerCase()
  if(legacy==='archived') return 'archived'
  if(legacy==='draft'||!enabled(row)) return 'draft'
  return 'published'
}
function displayFields(fields:string[]){
  const base=fields.filter((field)=>field!=='status')
  return fields.includes('status')?[...base,'status']:base
}

export function CollectionPanel({collectionKey,startNew=false,onStartNewHandled}:{collectionKey:string;startNew?:boolean;onStartNewHandled?:()=>void}){
  const meta=COLLECTIONS[collectionKey]
  const {data,collection,upsert,markArchived}=useCmsData()
  const toast=useToast()
  const rows=collection(collectionKey)
  const uid=auth.currentUser?.uid
  const profile=collection('cms_users').find((row)=>String(row.id||row.user_id||'')===String(uid||''))
  const role=String(profile?.role||'viewer')
  const canEditRole=['owner','admin','editor'].includes(role)
  const canEdit=canEditRole && (collectionKey!=='cms_users'||role==='owner')
  const [query,setQuery]=useState('')
  const [filter,setFilter]=useState('all')
  const [sort,setSort]=useState('default')
  const [group,setGroup]=useState(GROUP_BY_SERIES.has(collectionKey)?'series':'none')
  const [viewMode,setViewMode]=useState<'cards'|'table'>(CARD_COLLECTIONS.has(collectionKey)?'cards':'table')
  const [editing,setEditing]=useState<CmsRecord|null|undefined>(undefined)
  const [saving,setSaving]=useState(false)
  const [busy,setBusy]=useState('')

  useEffect(()=>{
    setQuery('');setFilter('all');setSort('default');setEditing(undefined)
    setGroup(GROUP_BY_SERIES.has(collectionKey)?'series':'none')
    setViewMode(CARD_COLLECTIONS.has(collectionKey)?'cards':'table')
  },[collectionKey])
  useEffect(()=>{
    if(startNew && collectionKey!=='cms_users'){
      setEditing(null)
      onStartNewHandled?.()
    }
  },[startNew,collectionKey])

  const statusOptions=useMemo(()=>Array.from(new Set(rows.map((r)=>String(r.status||'').trim()).filter(Boolean))).sort(),[rows])
  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase()
    let next=rows.filter((row)=>{
      if(q&&!JSON.stringify(row).toLowerCase().includes(q)) return false
      if(filter.startsWith('publication:')&&publicationState(row)!==filter.slice(12)) return false
      if(filter.startsWith('status:')&&String(row.status||'')!==filter.slice(7)) return false
      return true
    })
    if(sort==='az') next=[...next].sort((a,b)=>titleFor(a).localeCompare(titleFor(b),undefined,{numeric:true}))
    if(sort==='za') next=[...next].sort((a,b)=>titleFor(b).localeCompare(titleFor(a),undefined,{numeric:true}))
    if(sort==='newest') next=[...next].sort((a,b)=>recordDate(b).localeCompare(recordDate(a)))
    if(sort==='order') next=[...next].sort((a,b)=>Number(a.sort_order??9999)-Number(b.sort_order??9999))
    return next
  },[rows,query,filter,sort])

  const grouped=useMemo(()=>{
    if(group!=='series'||!GROUP_BY_SERIES.has(collectionKey)) return [{id:'all',title:'All records',rows:filtered}]
    const seriesRows=data?.collections?.series||[]
    const seriesCast=data?.collections?.series_cast||[]
    const byId=new Map(seriesRows.map((row)=>[String(row.series_id||row.id||''),String(row.title||'Untitled series')]))
    const buckets=new Map<string,CmsRecord[]>()
    function add(seriesId:string,row:CmsRecord){
      const key=seriesId||'unassigned'
      const list=buckets.get(key)||[]
      if(!list.some((existing)=>String(existing.id)===String(row.id))) list.push(row)
      buckets.set(key,list)
    }
    if(collectionKey==='episodes') filtered.forEach((row)=>add(String(row.series_id||''),row))
    if(collectionKey==='artists') filtered.forEach((row)=>{
      const artistId=String(row.artist_id||row.id||'')
      const links=seriesCast.filter((cast)=>String(cast.artist_id||'')===artistId).map((cast)=>String(cast.series_id||'')).filter(Boolean)
      if(!links.length) add('',row); else links.forEach((seriesId)=>add(seriesId,row))
    })
    const order=[...buckets.keys()].sort((a,b)=>{
      if(a==='unassigned') return 1;if(b==='unassigned') return -1
      return String(byId.get(a)||a).localeCompare(String(byId.get(b)||b),undefined,{numeric:true})
    })
    return order.map((id)=>({id,title:id==='unassigned'?'Not assigned to a series':byId.get(id)||id,rows:buckets.get(id)||[]}))
  },[group,collectionKey,filtered,data])

  async function save(form:CmsRecord,intent:SaveIntent){
    setSaving(true); setBusy(intent==='publish'?'Publishing…':intent==='draft'?'Saving draft…':'Saving changes…')
    try{
      const payload={...form}
      if(meta.publishable){
        payload.publication_status=intent==='publish'?'published':'draft'
        payload.enabled=intent==='publish'
      }
      let saved:CmsRecord
      if(editing){
        const id=String(editing.id||''); if(!id) throw new Error('Record document ID is missing.')
        saved=await api.update(collectionKey,id,payload)
      }else saved=await api.create(collectionKey,payload)
      upsert(collectionKey,saved); setEditing(undefined)
      toast.push('success',intent==='publish'?'Published successfully':intent==='draft'?'Draft saved':'Changes saved',`${meta.label} updated successfully.`)
    }catch(e){ toast.push('error','Save failed',e instanceof Error?e.message:'Unable to save changes.') }
    finally{setSaving(false);setBusy('')}
  }

  async function archive(row:CmsRecord){
    const id=String(row.id||''); if(!id) return
    setSaving(true);setBusy('Archiving record…')
    try{ await api.archive(collectionKey,id); markArchived(collectionKey,id); setEditing(undefined); toast.push('success','Archived successfully',`${meta.label} record is no longer public.`) }
    catch(e){toast.push('error','Archive failed',e instanceof Error?e.message:'Unable to archive record.')}
    finally{setSaving(false);setBusy('')}
  }

  const canCreate=canEdit&&collectionKey!=='cms_users'&&collectionKey!=='media'
  const columns=displayFields(meta.display)

  function renderCard(row:CmsRecord,index:number){
    const subtitle=subtitleFor(row)
    const details=columns.filter((field)=>!['title','display_name','full_name','status','enabled'].includes(field)).slice(0,3)
    const lifecycle=row.status&&String(row.status)!==publicationState(row)?String(row.status):''
    return <article className={`record-card ${canEdit?'':'read-only'}`} key={String(row.id||index)} onClick={()=>{if(canEdit)setEditing(row)}}>
      <div className="record-card-top"><div className="record-title-wrap"><strong>{titleFor(row)}</strong>{subtitle&&<span>{subtitle}</span>}</div>{canEdit&&<button className="secondary mini" onClick={(e)=>{e.stopPropagation();setEditing(row)}}>Edit</button>}</div>
      <dl>{details.map((field)=><div key={field}><dt>{labelize(field)}</dt><dd>{view(row[field])}</dd></div>)}</dl>
      <div className="record-card-footer">{lifecycle&&<span className="content-status-label">{labelize(lifecycle)}</span>}<span className={`record-badge publication-${publicationState(row)}`}>{labelize(publicationState(row))}</span></div>
    </article>
  }

  function renderTable(groupRows:CmsRecord[]){
    return <div className="table-wrap"><table><thead><tr>{columns.map((field)=><th key={field}>{labelize(field)}</th>)}{meta.publishable&&<th>Publication</th>}<th>Action</th></tr></thead><tbody>{groupRows.length?groupRows.map((row,index)=><tr key={String(row.id||index)} onClick={()=>{if(canEdit)setEditing(row)}}>{columns.map((field)=><td key={field}>{field==='status'?<span className="status-pill">{view(row[field])}</span>:view(row[field])}</td>)}{meta.publishable&&<td><span className={`record-badge publication-${publicationState(row)}`}>{labelize(publicationState(row))}</span></td>}<td>{canEdit?<button className="secondary mini" onClick={(e)=>{e.stopPropagation();setEditing(row)}}>Edit</button>:<span className="muted">View only</span>}</td></tr>):<tr><td colSpan={columns.length+(meta.publishable?2:1)}><div className="empty-state"><strong>No records found</strong><span>{query?'Try another search.':'Add your first record when you are ready.'}</span></div></td></tr>}</tbody></table></div>
  }

  return <section className="collection-panel easy-collection">
    <div className="collection-toolbar easy-toolbar">
      <div className="collection-heading"><div><h3>{meta.label}</h3><span>{filtered.length===rows.length?`${rows.length} record${rows.length===1?'':'s'}`:`Showing ${filtered.length} of ${rows.length}`}</span></div>{meta.description&&<p>{meta.description}</p>}{!canEdit&&<p className="muted">View-only access for your current CMS role.</p>}</div>
      <div className="toolbar-main-actions">{canCreate&&<button className="primary" onClick={()=>setEditing(null)}>+ Add {meta.label}</button>}</div>
    </div>

    <div className={`list-controls ${GROUP_BY_SERIES.has(collectionKey)?'with-group':''}`}>
      <div className="search-box"><span>⌕</span><input placeholder={`Search ${meta.label.toLowerCase()}…`} value={query} onChange={(e)=>setQuery(e.target.value)}/>{query&&<button onClick={()=>setQuery('')}>×</button>}</div>
      <select aria-label="Filter records" value={filter} onChange={(e)=>setFilter(e.target.value)}>
        <option value="all">All records</option>
        {meta.publishable&&<><option value="publication:published">Published</option><option value="publication:draft">Drafts</option><option value="publication:archived">Archived</option></>}
        {statusOptions.map((s)=><option key={s} value={`status:${s}`}>{labelize(s)}</option>)}
      </select>
      <select aria-label="Sort records" value={sort} onChange={(e)=>setSort(e.target.value)}>
        <option value="default">Default order</option><option value="order">Display order</option><option value="newest">Newest first</option><option value="az">A → Z</option><option value="za">Z → A</option>
      </select>
      {GROUP_BY_SERIES.has(collectionKey)&&<select aria-label="Group records" value={group} onChange={(e)=>setGroup(e.target.value)}><option value="series">Group by series</option><option value="none">No grouping</option></select>}
      <div className="view-toggle"><button className={viewMode==='cards'?'active':''} onClick={()=>setViewMode('cards')} title="Card view">▦</button><button className={viewMode==='table'?'active':''} onClick={()=>setViewMode('table')} title="Table view">☷</button></div>
    </div>

    <div className="series-group-stack">{grouped.length?grouped.map((bucket)=><section className="series-group" key={bucket.id}>{group==='series'&&<div className="series-group-head"><div><span>Series</span><h4>{bucket.title}</h4></div><b>{bucket.rows.length}</b></div>}{viewMode==='cards'?<div className="record-grid">{bucket.rows.length?bucket.rows.map(renderCard):<div className="empty-state record-empty"><strong>No records found</strong><span>Try another search or filter.</span></div>}</div>:renderTable(bucket.rows)}</section>):<div className="empty-state record-empty"><strong>No records found</strong><span>{query||filter!=='all'?'Clear your search or filters.':'Add your first record when you are ready.'}</span></div>}</div>

    <RecordEditor open={canEdit&&editing!==undefined} meta={meta} record={editing||null} collections={data?.collections||{}} saving={saving} onClose={()=>setEditing(undefined)} onSave={save} onArchive={editing?archive:undefined}/>
    {busy&&<BusyOverlay title={busy} detail="Please wait while the CMS updates Firebase."/>}
  </section>
}
