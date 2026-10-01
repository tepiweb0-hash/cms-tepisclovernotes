import { useEffect, useMemo, useState } from 'react'
import type { CmsRecord } from '../../types/cms'
import type { CollectionMeta } from '../../config/collections'
import { FIELD_HELP, labelize } from '../../config/collections'
import { ButtonSpinner } from '../loaders/ButtonSpinner'
import { ConfirmDialog } from '../dialogs/ConfirmDialog'

const BOOL_FIELDS=new Set(['enabled','featured','hot','indexable','open_new_tab','is_webp','editable'])
const LONG_RE=/bio|description|synopsis|body|excerpt|message|quick_info|full_info|copy_override|seo_description|notes|summary|short_info|caption/
const NUMBER_RE=/(^year$|_order$|_cm$|_kg$|_score$|_count$|_ms$|^bytes$|^priority$|episode_number|billing_order|duration_minutes|status_code|height_cm|hot_score|width|height)/
const DATE_RE=/(^date$|_date$)/
const TIME_RE=/(^time$|_time$)/

const ENUMS:Record<string,string[]>={
  status:['draft','published','archived','planned','airing','completed','active','released','scheduled','ready','external_seed'],
  template_key:['hero','split','showcase','card_grid','media_gallery'],
  display_mode:['single','carousel','fade','crossfade'],album_display_mode:['single','carousel','fade','crossfade'],
  alignment:['left','right','center'],role_type:['lead','support','guest','cameo'],slot:['hero','current_series','artist_showcase','news','custom'],
  entity_type:['artist','series','episode','event','news','page','manual'],related_entity_type:['artist','series','episode','event','news','page','manual'],
}

const RELATIONS:Record<string,[string,string,string]>={
  artist_id:['artists','artist_id','display_name'],related_artist_id:['artists','artist_id','display_name'],
  series_id:['series','series_id','title'],related_series_id:['series','series_id','title'],
  episode_id:['episodes','episode_id','title'],page_id:['pages','page_id','title'],section_id:['sections','section_id','title'],
  media_id:['media','media_id','title'],profile_media_id:['media','media_id','title'],hero_media_id:['media','media_id','title'],poster_media_id:['media','media_id','title'],featured_media_id:['media','media_id','title'],thumbnail_media_id:['media','media_id','title'],media_id_override:['media','media_id','title'],
}

function bool(v:unknown){ return v===true || String(v).toLowerCase()==='true' || String(v)==='1' }
function inputValue(v:unknown){ if(v===null||v===undefined) return ''; if(typeof v==='object') return JSON.stringify(v); return String(v) }

function relatedOptions(collections:Record<string,CmsRecord[]>){
  return [
    ...(collections.news||[]).map((r)=>({value:String(r.news_id||r.id||''),label:`News · ${r.title||r.news_id||r.id}`})),
    ...(collections.events||[]).map((r)=>({value:String(r.event_id||r.id||''),label:`Event · ${r.title||r.event_id||r.id}`})),
    ...(collections.episodes||[]).map((r)=>({value:String(r.episode_id||r.id||''),label:`Episode · ${r.title||r.episode_id||r.id}`})),
    ...(collections.series||[]).map((r)=>({value:String(r.series_id||r.id||''),label:`Series · ${r.title||r.series_id||r.id}`})),
  ]
}

export function RecordEditor({open,meta,record,collections,saving,onClose,onSave,onArchive}:{open:boolean;meta:CollectionMeta;record:CmsRecord|null;collections:Record<string,CmsRecord[]>;saving:boolean;onClose:()=>void;onSave:(record:CmsRecord)=>Promise<void>;onArchive?:(record:CmsRecord)=>Promise<void>}){
  const [form,setForm]=useState<CmsRecord>({})
  const [discard,setDiscard]=useState(false)
  const [archive,setArchive]=useState(false)
  useEffect(()=>{ if(open) setForm(record?{...record}:{enabled:true}) },[open,record])
  const initial=useMemo(()=>JSON.stringify(record?{...record}:{enabled:true}),[record,open])
  const dirty=JSON.stringify(form)!==initial
  useEffect(()=>{
    if(!open||!dirty) return
    const fn=(e:BeforeUnloadEvent)=>{ e.preventDefault(); e.returnValue='' }
    window.addEventListener('beforeunload',fn); return()=>window.removeEventListener('beforeunload',fn)
  },[open,dirty])
  if(!open) return null

  function requestClose(){ if(dirty&&!saving) setDiscard(true); else onClose() }
  function setField(field:string,value:unknown){ setForm((v)=>({...v,[field]:value})) }

  function optionsFor(field:string){
    if(field==='related_entity_id') return relatedOptions(collections)
    const rel=RELATIONS[field]
    if(rel){ const [name,id,label]=rel; return (collections[name]||[]).map((r)=>({value:String(r[id]||r.id||''),label:String(r[label]||r[id]||r.id||'')})) }
    let values=ENUMS[field]
    if(field==='type'&&meta.key==='notifications') values=['manual','episode_release','event','news']
    if(values) return values.map((v)=>({value:v,label:labelize(v)}))
    return null
  }

  return <>
    <div className="modal-backdrop editor-backdrop" onMouseDown={requestClose}>
      <section className="editor-card" onMouseDown={(e)=>e.stopPropagation()}>
        <header className="editor-head"><div><p className="eyebrow">{record?'Edit record':'New record'}</p><h2>{meta.label}</h2></div><button className="icon-action plain" onClick={requestClose}>×</button></header>
        <div className="editor-body">
          {meta.fields.map((field)=>{
            const v=form[field]
            const isId=field===meta.idField
            const options=optionsFor(field)
            const full=LONG_RE.test(field)
            return <label className={`field ${full?'full':''}`} key={field}><span>{labelize(field)}</span>
              {isId&&record ? <input value={inputValue(v)} readOnly />
              : BOOL_FIELDS.has(field) ? <span className="checkline"><input type="checkbox" checked={bool(v)} onChange={(e)=>setField(field,e.target.checked)}/> {field==='enabled'?'Show publicly':'Yes / turned on'}</span>
              : options ? <select value={inputValue(v)} onChange={(e)=>setField(field,e.target.value)}><option value="">—</option>{options.map((o)=><option key={`${o.value}-${o.label}`} value={o.value}>{o.label}</option>)}</select>
              : full ? <textarea value={inputValue(v)} onChange={(e)=>setField(field,e.target.value)} />
              : <input type={NUMBER_RE.test(field)?'number':DATE_RE.test(field)?'date':TIME_RE.test(field)?'time':'text'} value={DATE_RE.test(field)?inputValue(v).slice(0,10):inputValue(v)} placeholder={isId&&!record?'Auto-generated on save':''} onChange={(e)=>setField(field,NUMBER_RE.test(field)&&e.target.value!==''?Number(e.target.value):e.target.value)} />}
              {(FIELD_HELP[field]||isId)&&<small>{FIELD_HELP[field]||(record?'This ID is already assigned.':'Leave blank to auto-generate.')}</small>}
            </label>
          })}
        </div>
        <footer className="editor-actions"><div>{record&&onArchive&&<button className="danger-btn" disabled={saving} onClick={()=>setArchive(true)}>Archive</button>}</div><div><button className="secondary" disabled={saving} onClick={requestClose}>Cancel</button><button className="primary" disabled={saving} onClick={()=>void onSave(form)}>{saving&&<ButtonSpinner/>}{saving?'Saving…':'Save changes'}</button></div></footer>
      </section>
    </div>
    <ConfirmDialog open={discard} title="Discard unsaved changes?" body="Your edits have not been saved yet." confirmLabel="Discard changes" danger onCancel={()=>setDiscard(false)} onConfirm={()=>{setDiscard(false);onClose()}} />
    <ConfirmDialog open={archive} title={`Archive this ${meta.label.toLowerCase()} record?`} body="It will stop appearing publicly. The record will remain in the database for recovery or auditing." confirmLabel="Archive" danger onCancel={()=>setArchive(false)} onConfirm={()=>{setArchive(false);if(record&&onArchive) void onArchive(record)}} />
  </>
}
