import { useMemo, useState } from 'react'
import { COLLECTIONS, labelize } from '../../config/collections'
import { useCmsData } from '../../context/CmsDataContext'
import { api } from '../../services/api'
import type { CmsRecord } from '../../types/cms'
import { useToast } from '../../context/ToastContext'
import { RecordEditor } from './RecordEditor'
import { BusyOverlay } from '../loaders/BusyOverlay'

function view(value:unknown){
  if(typeof value==='boolean') return value?'Yes':'No'
  if(value===null||value===undefined||value==='') return '—'
  const s=typeof value==='object'?JSON.stringify(value):String(value)
  return s.length>86?`${s.slice(0,83)}…`:s
}

export function CollectionPanel({collectionKey}:{collectionKey:string}){
  const meta=COLLECTIONS[collectionKey]
  const {data,collection,upsert,markArchived}=useCmsData()
  const toast=useToast()
  const rows=collection(collectionKey)
  const [query,setQuery]=useState('')
  const [editing,setEditing]=useState<CmsRecord|null|undefined>(undefined)
  const [saving,setSaving]=useState(false)
  const [busy,setBusy]=useState('')

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase(); if(!q) return rows
    return rows.filter((row)=>JSON.stringify(row).toLowerCase().includes(q))
  },[rows,query])

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

  const canCreate=collectionKey!=='cms_users'
  return <section className="collection-panel">
    <div className="collection-toolbar"><div><h3>{meta.label}</h3><span>{rows.length} record{rows.length===1?'':'s'}</span></div><div className="toolbar-actions"><input placeholder={`Search ${meta.label.toLowerCase()}…`} value={query} onChange={(e)=>setQuery(e.target.value)}/>{canCreate&&<button className="primary" onClick={()=>setEditing(null)}>+ New</button>}</div></div>
    <div className="table-wrap"><table><thead><tr>{meta.display.map((field)=><th key={field}>{labelize(field)}</th>)}</tr></thead><tbody>{filtered.length?filtered.map((row,index)=><tr key={String(row.id||index)} onClick={()=>setEditing(row)}>{meta.display.map((field)=><td key={field}>{field==='status'?<span className="status-pill">{view(row[field])}</span>:view(row[field])}</td>)}</tr>):<tr><td colSpan={meta.display.length}><div className="empty-state"><strong>No records found</strong><span>{query?'Try another search.':'Add your first record when you are ready.'}</span></div></td></tr>}</tbody></table></div>
    <RecordEditor open={editing!==undefined} meta={meta} record={editing||null} collections={data?.collections||{}} saving={saving} onClose={()=>setEditing(undefined)} onSave={save} onArchive={editing?archive:undefined}/>
    {busy&&<BusyOverlay title={busy} detail="Please wait while the CMS updates Firebase."/>}
  </section>
}
