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
const LINK_RE=/(url$|href$|instagram|tiktok|twitter|x_twitter)/
const MEDIA_RE=/(media_id|image|photo|poster|thumbnail)/

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

type GroupKey='basic'|'content'|'media'|'publishing'|'seo'|'advanced'
const GROUP_META:Record<GroupKey,{title:string;description:string}>={
  basic:{title:'Basic information',description:'The main details visitors see first.'},
  content:{title:'Content',description:'Descriptions, summaries and longer copy.'},
  media:{title:'Media & links',description:'Images, source links and external destinations.'},
  publishing:{title:'Publishing',description:'Visibility, dates, status and display order.'},
  seo:{title:'SEO',description:'Search engine title and description.'},
  advanced:{title:'Advanced',description:'Technical and less frequently edited fields.'},
}

function bool(v:unknown){ return v===true || String(v).toLowerCase()==='true' || String(v)==='1' }
function inputValue(v:unknown){ if(v===null||v===undefined) return ''; if(typeof v==='object') return JSON.stringify(v); return String(v) }
function slugify(v:string){return v.toLowerCase().trim().replace(/['’]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}
function isGeneratedId(field:string){return /_id$/.test(field)}

function groupFor(field:string,meta:CollectionMeta):GroupKey{
  if(field.startsWith('seo_')) return 'seo'
  if(MEDIA_RE.test(field)||LINK_RE.test(field)) return 'media'
  if(LONG_RE.test(field)) return 'content'
  if(/^(status|enabled|featured|hot|hot_score|indexable|open_new_tab|sort_order|priority|publish_at|published_at|publish_date|release_date|release_time|release_day|premiere_date|finale_date|start_date|end_date|start_time|end_time|created_at|updated_at|expires_at|date|timezone)$/.test(field)) return 'publishing'
  if(field===meta.idField || /^(bytes|width|height|mime_type|format|asset_id|cloudinary_public_id|is_webp|editable|type|group|usage|interval_ms|transition_ms|status_code)$/.test(field)) return 'advanced'
  return 'basic'
}

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

  // Keep every hook above the early return. React requires hooks to run in the
  // same order on every render; placing the groups useMemo below `if (!open)`
  // caused invariant #310 when the editor changed from closed to open.
  const groups=useMemo(()=>{
    const result:Record<GroupKey,string[]>={basic:[],content:[],media:[],publishing:[],seo:[],advanced:[]}
    meta.fields.forEach((field)=>{
      if(field===meta.idField && !record && isGeneratedId(field)) return
      result[groupFor(field,meta)].push(field)
    })
    return result
  },[meta,record])

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

  function mediaPreview(field:string,value:unknown){
    if(!MEDIA_RE.test(field)||!value) return null
    const id=String(value)
    const media=(collections.media||[]).find((r)=>String(r.media_id||r.id||'')===id)
    const url=String(media?.secure_url||media?.url||media?.source_url||'')
    if(!url) return null
    return <div className="selected-media-preview"><img src={url} alt=""/><div><strong>{String(media?.title||id)}</strong><span>Selected media</span></div></div>
  }

  function renderField(field:string){
    const v=form[field]
    const isId=field===meta.idField
    const options=optionsFor(field)
    const full=LONG_RE.test(field)
    const help=FIELD_HELP[field]||(isId?(record?'This technical ID is already assigned.':'Leave blank to auto-generate when supported.'):'')
    const base=<>
      {isId&&record ? <input value={inputValue(v)} readOnly />
      : BOOL_FIELDS.has(field) ? <span className="checkline"><input type="checkbox" checked={bool(v)} onChange={(e)=>setField(field,e.target.checked)}/><span><b>{bool(v)?'On':'Off'}</b><small>{field==='enabled'?'Controls whether this item can appear publicly.':'Toggle this setting.'}</small></span></span>
      : options ? <select value={inputValue(v)} onChange={(e)=>setField(field,e.target.value)}><option value="">— Select —</option>{options.map((o)=><option key={`${o.value}-${o.label}`} value={o.value}>{o.label}</option>)}</select>
      : full ? <textarea rows={field==='body'||field==='full_info'||field==='full_synopsis'||field==='synopsis'?7:4} value={inputValue(v)} onChange={(e)=>setField(field,e.target.value)} />
      : <div className={field==='slug'?'input-with-action':''}><input type={NUMBER_RE.test(field)?'number':DATE_RE.test(field)?'date':TIME_RE.test(field)?'time':'text'} value={DATE_RE.test(field)?inputValue(v).slice(0,10):inputValue(v)} placeholder={isId&&!record?'Auto-generated on save':''} onChange={(e)=>setField(field,NUMBER_RE.test(field)&&e.target.value!==''?Number(e.target.value):e.target.value)} />{field==='slug'&&<button type="button" className="secondary mini" onClick={()=>{const source=String(form.title||form.display_name||form.full_name||'');if(source)setField('slug',slugify(source))}}>Generate</button>}</div>}
    </>
    return <label className={`field ${full?'full':''}`} key={field}><span>{labelize(field)}</span>{base}{mediaPreview(field,v)}{help&&<small>{help}</small>}</label>
  }

  const recordId=record?String(record[meta.idField]||record.id||''):''
  return <>
    <div className="modal-backdrop editor-backdrop" onMouseDown={requestClose}>
      <section className="editor-card easy-editor" onMouseDown={(e)=>e.stopPropagation()}>
        <header className="editor-head easy-editor-head"><div><p className="eyebrow">{record?'Edit':'Create'}</p><div className="editor-title-line"><h2>{meta.label}</h2>{dirty&&<span className="unsaved-chip">Unsaved changes</span>}</div>{recordId&&<div className="record-id-line"><code>{recordId}</code><button className="plain-copy" type="button" onClick={()=>void navigator.clipboard?.writeText(recordId)}>Copy ID</button></div>}</div><button className="icon-action plain" onClick={requestClose}>×</button></header>
        <div className="editor-body easy-editor-body">
          {(Object.keys(GROUP_META) as GroupKey[]).map((group)=>{
            const fields=groups[group]
            if(!fields.length) return null
            const info=GROUP_META[group]
            const content=<div className="editor-subgrid">{fields.map(renderField)}</div>
            return group==='advanced'?<details className="editor-section advanced-section" key={group}><summary><div><h3>{info.title}</h3><p>{info.description}</p></div><span>Show fields</span></summary>{content}</details>:<section className="editor-section" key={group}><div className="editor-section-head"><h3>{info.title}</h3><p>{info.description}</p></div>{content}</section>
          })}
        </div>
        <footer className="editor-actions easy-editor-actions"><div>{record&&onArchive&&<button className="danger-btn" disabled={saving} onClick={()=>setArchive(true)}>Archive</button>}</div><div><span className="save-hint">{dirty?'Changes are not saved yet.':'No unsaved changes.'}</span><button className="secondary" disabled={saving} onClick={requestClose}>Close</button><button className="primary" disabled={saving||!dirty} onClick={()=>void onSave(form)}>{saving&&<ButtonSpinner/>}{saving?'Saving…':record?'Save changes':'Create record'}</button></div></footer>
      </section>
    </div>
    <ConfirmDialog open={discard} title="Discard unsaved changes?" body="Your edits have not been saved yet." confirmLabel="Discard changes" danger onCancel={()=>setDiscard(false)} onConfirm={()=>{setDiscard(false);onClose()}} />
    <ConfirmDialog open={archive} title={`Archive this ${meta.label.toLowerCase()} record?`} body="It will stop appearing publicly. The record will remain in the database for recovery or auditing." confirmLabel="Archive" danger onCancel={()=>setArchive(false)} onConfirm={()=>{setArchive(false);if(record&&onArchive) void onArchive(record)}} />
  </>
}
