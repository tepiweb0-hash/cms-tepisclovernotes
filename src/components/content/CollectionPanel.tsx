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
  const [viewMode,setViewMode]=useState<'cards'|'table'>(CARD_COLLECTIONS.has(collectionKey)?'cards':'table')
  const [editing,setEditing]=useState<CmsRecord|null|undefined>(undefined)
  const [saving,setSaving]=useState(false)
  const [busy,setBusy]=useState('')

  useEffect(()=>{
    setQuery('');setFilter('all');setSort('default');setEditing(undefined)
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
      if(filter==='enabled'&&!enabled(row)) return false
      if(filter==='disabled'&&enabled(row)) return false
      if(filter.startsWith('status:')&&String(row.status||'')!==filter.slice(7)) return false
      return true
    })
    if(sort==='az') next=[...next].sort((a,b)=>titleFor(a).localeCompare(titleFor(b),undefined,{numeric:true}))
    if(sort==='za') next=[...next].sort((a,b)=>titleFor(b).localeCompare(titleFor(a),undefined,{numeric:true}))
    if(sort==='newest') next=[...next].sort((a,b)=>recordDate(b).localeCompare(recordDate(a)))
    if(sort==='order') next=[...next].sort((a,b)=>Number(a.sort_order??9999)-Number(b.sort_order??9999))
    return next
  },[rows,query,filter,sort])

  async function save(form:CmsRecord){
    setSaving(true); setBusy('Saving changes…')
    try{
      let saved:CmsRecord
      if(editing){
        const id=String(editing.id||''); if(!id) throw new Error('Record document ID is missing.')
        saved=await api.update(collectionKey,id,form)
      }else saved=await api.create(collectionKey,form)
      upsert(collectionKey,saved); setEditing(undefined); toast.push('success','Changes saved',`${meta.label} updated successfully.`)
    }catch(e){ toast.push('error','Save failed',e instanceof Error?e.message:'Unable to save changes.') }
    finally{setSaving(false);setBusy('')}
  }

  async function archive(row:CmsRecord){
    const id=String(row.id||''); if(!id) return
    setSaving(true);setBusy('Archiving record…')
    try{ await api.archive(collectionKey,id); markArchived(collectionKey,id); setEditing(undefined); toast.push('success','Archived successfully',`${meta.label} record is no longer active publicly.`) }
    catch(e){toast.push('error','Archive failed',e instanceof Error?e.message:'Unable to archive record.')}
    finally{setSaving(false);setBusy('')}
  }

  const canCreate=canEdit&&collectionKey!=='cms_users'&&collectionKey!=='media'
  return <section className="collection-panel easy-collection">
    <div className="collection-toolbar easy-toolbar">
      <div className="collection-heading"><div><h3>{meta.label}</h3><span>{filtered.length===rows.length?`${rows.length} record${rows.length===1?'':'s'}`:`Showing ${filtered.length} of ${rows.length}`}</span></div>{meta.description&&<p>{meta.description}</p>}{!canEdit&&<p className="muted">View-only access for your current CMS role.</p>}</div>
      <div className="toolbar-main-actions">{canCreate&&<button className="primary" onClick={()=>setEditing(null)}>+ Add {meta.label}</button>}</div>
    </div>

    <div className="list-controls">
      <div className="search-box"><span>⌕</span><input placeholder={`Search ${meta.label.toLowerCase()}…`} value={query} onChange={(e)=>setQuery(e.target.value)}/>{query&&<button onClick={()=>setQuery('')}>×</button>}</div>
      <select aria-label="Filter records" value={filter} onChange={(e)=>setFilter(e.target.value)}>
        <option value="all">All records</option>
        <option value="enabled">Shown publicly</option>
        <option value="disabled">Hidden / disabled</option>
        {statusOptions.map((s)=><option key={s} value={`status:${s}`}>{labelize(s)}</option>)}
      </select>
      <select aria-label="Sort records" value={sort} onChange={(e)=>setSort(e.target.value)}>
        <option value="default">Default order</option><option value="order">Display order</option><option value="newest">Newest first</option><option value="az">A → Z</option><option value="za">Z → A</option>
      </select>
      <div className="view-toggle"><button className={viewMode==='cards'?'active':''} onClick={()=>setViewMode('cards')} title="Card view">▦</button><button className={viewMode==='table'?'active':''} onClick={()=>setViewMode('table')} title="Table view">☷</button></div>
    </div>

    {viewMode==='cards'?<div className="record-grid">{filtered.length?filtered.map((row,index)=>{
      const subtitle=subtitleFor(row)
      const details=meta.display.filter((field)=>!['title','display_name','full_name','status','enabled'].includes(field)).slice(0,3)
      return <article className={`record-card ${canEdit?'':'read-only'}`} key={String(row.id||index)} onClick={()=>{if(canEdit)setEditing(row)}}>
        <div className="record-card-top"><div className="record-title-wrap"><strong>{titleFor(row)}</strong>{subtitle&&<span>{subtitle}</span>}</div>{canEdit&&<button className="secondary mini" onClick={(e)=>{e.stopPropagation();setEditing(row)}}>Edit</button>}</div>
        <div className="record-badges">{Boolean(row.status)&&<span className={`record-badge status-${String(row.status).toLowerCase()}`}>{labelize(String(row.status))}</span>}<span className={`record-badge ${enabled(row)?'shown':'hidden'}`}>{enabled(row)?'Shown':'Hidden'}</span></div>
        <dl>{details.map((field)=><div key={field}><dt>{labelize(field)}</dt><dd>{view(row[field])}</dd></div>)}</dl>
      </article>
    }):<div className="empty-state record-empty"><strong>No records found</strong><span>{query||filter!=='all'?'Clear your search or filters.':'Add your first record when you are ready.'}</span>{(query||filter!=='all')&&<button className="secondary mini" onClick={()=>{setQuery('');setFilter('all')}}>Clear filters</button>}</div>}</div>
    :<div className="table-wrap"><table><thead><tr>{meta.display.map((field)=><th key={field}>{labelize(field)}</th>)}<th>Action</th></tr></thead><tbody>{filtered.length?filtered.map((row,index)=><tr key={String(row.id||index)} onClick={()=>{if(canEdit)setEditing(row)}}>{meta.display.map((field)=><td key={field}>{field==='status'?<span className="status-pill">{view(row[field])}</span>:view(row[field])}</td>)}<td>{canEdit?<button className="secondary mini" onClick={(e)=>{e.stopPropagation();setEditing(row)}}>Edit</button>:<span className="muted">View only</span>}</td></tr>):<tr><td colSpan={meta.display.length+1}><div className="empty-state"><strong>No records found</strong><span>{query?'Try another search.':'Add your first record when you are ready.'}</span></div></td></tr>}</tbody></table></div>}

    <RecordEditor open={canEdit&&editing!==undefined} meta={meta} record={editing||null} collections={data?.collections||{}} saving={saving} onClose={()=>setEditing(undefined)} onSave={save} onArchive={editing?archive:undefined}/>
    {busy&&<BusyOverlay title={busy} detail="Please wait while the CMS updates Firebase."/>}
  </section>
}
