import { useEffect, useMemo, useState } from 'react'
import type { CmsRecord } from '../../types/cms'
import type { CollectionMeta } from '../../config/collections'
import { helpForField, labelize } from '../../config/collections'
import { ButtonSpinner } from '../loaders/ButtonSpinner'
import { ConfirmDialog } from '../dialogs/ConfirmDialog'

const BOOL_FIELDS=new Set(['enabled','featured','hot','indexable','open_new_tab','is_webp','editable'])
const LONG_RE=/bio|description|synopsis|body|excerpt|message|quick_info|full_info|copy_override|seo_description|notes|summary|short_info|caption/
const NUMBER_RE=/(^year$|_order$|_cm$|_kg$|_score$|_count$|_ms$|^bytes$|^priority$|episode_number|billing_order|duration_minutes|status_code|height_cm|hot_score|width|height)/
const DATE_RE=/(^date$|_date$)/
const DATETIME_RE=/(^|_)(publish_at|published_at|created_at|updated_at|uploaded_at|expires_at)$/
const TIME_RE=/(^time$|_time$)/
const LINK_RE=/(url$|href$|instagram|tiktok|twitter|x_twitter)/
const MEDIA_RE=/(media_id|image|photo|poster|thumbnail)/

const ENUMS:Record<string,string[]>={
  status:['draft','published','archived','planned','airing','completed','active','released','scheduled','ready','external_seed'],
  template_key:['hero','split','showcase','card_grid','media_gallery'],
  display_mode:['single','carousel','fade','crossfade'],album_display_mode:['single','carousel','fade','crossfade'],
  alignment:['left','right','center'],role_type:['lead','support','guest','cameo'],slot:['hero','current_series','artist_showcase','artist_heading','news_heading','news','custom'],
  entity_type:['artist','series','episode','event','news','page','manual'],related_entity_type:['artist','series','episode','event','news','page','manual'],
  role:['owner','admin','editor','viewer'],
}

const RELATIONS:Record<string,[string,string,string]>={
  artist_id:['artists','artist_id','display_name'],related_artist_id:['artists','artist_id','display_name'],
  series_id:['series','series_id','title'],related_series_id:['series','series_id','title'],
  episode_id:['episodes','episode_id','title'],page_id:['pages','page_id','title'],section_id:['sections','section_id','title'],
  media_id:['media','media_id','title'],profile_media_id:['media','media_id','title'],hero_media_id:['media','media_id','title'],poster_media_id:['media','media_id','title'],featured_media_id:['media','media_id','title'],thumbnail_media_id:['media','media_id','title'],media_id_override:['media','media_id','title'],
}

const ACTION_FIELDS:Record<string,{label:string;url:string;title:string;description:string}>={
  section_items:{label:'button_label',url:'href',title:'Action button',description:'Configure the optional button for this section item.'},
  home_features:{label:'button_label',url:'button_href',title:'Action button',description:'Create the button visitors click from this homepage feature.'},
  notifications:{label:'cta_label',url:'link_url',title:'Notification action button',description:'Choose the button text and where the notification should open.'},
}

type GroupKey='basic'|'content'|'media'|'publishing'|'seo'|'advanced'
type SaveIntent='draft'|'publish'|'save'
const GROUP_META:Record<GroupKey,{title:string;description:string}>={
  basic:{title:'Basic information',description:'The main details visitors see first.'},
  content:{title:'Content',description:'Descriptions, summaries and longer copy.'},
  media:{title:'Media & links',description:'Images, source links and external destinations.'},
  publishing:{title:'Scheduling & display',description:'Dates, display order and content lifecycle details.'},
  seo:{title:'SEO',description:'Search engine title and description.'},
  advanced:{title:'Advanced',description:'Technical and less frequently edited fields.'},
}

function bool(v:unknown){ return v===true || String(v).toLowerCase()==='true' || String(v)==='1' }
function inputValue(v:unknown){ if(v===null||v===undefined) return ''; if(typeof v==='object') return JSON.stringify(v); return String(v) }
function slugify(v:string){return v.toLowerCase().trim().replace(/['’]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}
function isGeneratedId(field:string){return /_id$/.test(field)}
function toDateTimeLocal(value:unknown){
  const raw=inputValue(value).trim()
  if(!raw) return ''
  const normalized=raw.replace(' ','T')
  return normalized.length>=16?normalized.slice(0,16):normalized
}
function publicationState(record:CmsRecord|null|undefined){
  const explicit=String(record?.publication_status||'').toLowerCase()
  if(explicit==='archived'||explicit==='draft'||explicit==='published') return explicit
  const legacy=String(record?.status||'').toLowerCase()
  if(legacy==='archived') return 'archived'
  if(legacy==='draft'||record?.enabled===false||String(record?.enabled).toLowerCase()==='false') return 'draft'
  return 'published'
}

function groupFor(field:string,meta:CollectionMeta):GroupKey{
  if(field.startsWith('seo_')) return 'seo'
  if(MEDIA_RE.test(field)||LINK_RE.test(field)) return 'media'
  if(LONG_RE.test(field)) return 'content'
  if(/^(status|featured|hot|hot_score|indexable|open_new_tab|sort_order|priority|publish_at|published_at|publish_date|release_date|release_time|release_day|premiere_date|finale_date|start_date|end_date|start_time|end_time|created_at|updated_at|uploaded_at|expires_at|date|timezone)$/.test(field)) return 'publishing'
  if(field===meta.idField || /^(bytes|width|height|mime_type|format|asset_id|cloudinary_public_id|file_id|is_webp|editable|type|group|usage|interval_ms|transition_ms|status_code)$/.test(field)) return 'advanced'
  return 'basic'
}

function entityOptions(collections:Record<string,CmsRecord[]>,type:unknown){
  const t=String(type||'')
  const defs:Record<string,[string,string,string,string]>={
    artist:['artists','artist_id','display_name','Artist'],
    series:['series','series_id','title','Series'],
    episode:['episodes','episode_id','title','Episode'],
    event:['events','event_id','title','Event'],
    news:['news','news_id','title','News'],
    page:['pages','page_id','title','Page'],
  }
  const def=defs[t]
  if(!def) return []
  const [collection,id,label,prefix]=def
  return (collections[collection]||[]).map((r)=>({value:String(r[id]||r.id||''),label:`${prefix} · ${String(r[label]||r[id]||r.id||'')}`}))
}

function relatedOptions(collections:Record<string,CmsRecord[]>){
  return Object.keys({artist:1,series:1,episode:1,event:1,news:1,page:1}).flatMap((type)=>entityOptions(collections,type))
}

function destinationOptions(collections:Record<string,CmsRecord[]>){
  const rows:[string,string][]=[['/','Homepage'],['/artists','All Artists'],['/series','All Series'],['/events','All Events'],['/news','All News']]
  ;(collections.artists||[]).forEach((r)=>{if(r.slug) rows.push([`/artists/${String(r.slug)}`,`Artist · ${String(r.display_name||r.slug)}`])})
  ;(collections.series||[]).forEach((r)=>{if(r.slug) rows.push([`/series/${String(r.slug)}`,`Series · ${String(r.title||r.slug)}`])})
  ;(collections.news||[]).forEach((r)=>{if(r.slug) rows.push([`/news/${String(r.slug)}`,`News · ${String(r.title||r.slug)}`])})
  return rows
}

export function RecordEditor({open,meta,record,collections,saving,onClose,onSave,onArchive}:{open:boolean;meta:CollectionMeta;record:CmsRecord|null;collections:Record<string,CmsRecord[]>;saving:boolean;onClose:()=>void;onSave:(record:CmsRecord,intent:SaveIntent)=>Promise<void>;onArchive?:(record:CmsRecord)=>Promise<void>}){
  const [form,setForm]=useState<CmsRecord>({})
  const [discard,setDiscard]=useState(false)
  const [archive,setArchive]=useState(false)
  const [errors,setErrors]=useState<Record<string,string>>({})
  useEffect(()=>{ if(open){ setForm(record?{...record}:{enabled:true});setErrors({}) } },[open,record])
  const initial=useMemo(()=>JSON.stringify(record?{...record}:{enabled:true}),[record,open])
  const dirty=JSON.stringify(form)!==initial
  useEffect(()=>{
    if(!open||!dirty) return
    const fn=(e:BeforeUnloadEvent)=>{ e.preventDefault(); e.returnValue='' }
    window.addEventListener('beforeunload',fn); return()=>window.removeEventListener('beforeunload',fn)
  },[open,dirty])

  const actionMeta=ACTION_FIELDS[meta.key]
  const groups=useMemo(()=>{
    const result:Record<GroupKey,string[]>={basic:[],content:[],media:[],publishing:[],seo:[],advanced:[]}
    meta.fields.forEach((field)=>{
      if(field==='publication_status') return
      if(meta.publishable&&field==='enabled') return
      if(actionMeta&&(field===actionMeta.label||field===actionMeta.url)) return
      if(field==='status'&&meta.publishable&&!meta.statusOptions?.length) return
      if(field===meta.idField && !record && isGeneratedId(field)) return
      result[groupFor(field,meta)].push(field)
    })
    if(result.publishing.includes('status')) result.publishing=[...result.publishing.filter((f)=>f!=='status'),'status']
    return result
  },[meta,record,actionMeta])

  if(!open) return null

  function requestClose(){ if(dirty&&!saving) setDiscard(true); else onClose() }
  function setField(field:string,value:unknown){ setForm((v)=>({...v,[field]:value})); if(errors[field])setErrors((current)=>({...current,[field]:''})) }

  function optionsFor(field:string){
    if(field==='status'&&meta.statusOptions) return meta.statusOptions.map((v)=>({value:v,label:labelize(v)}))
    if(field==='entity_id') return entityOptions(collections,form.entity_type)
    if(field==='related_entity_id') {
      const specific=entityOptions(collections,form.related_entity_type)
      return specific.length?specific:relatedOptions(collections)
    }
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

  function renderLabel(field:string){
    const required=meta.required?.includes(field)
    const help=helpForField(field,meta)
    return <div className="field-label-row"><span>{labelize(field)}{required&&<b className="required-mark"> *</b>}</span><button type="button" className="field-info" aria-label={`About ${labelize(field)}`} data-tooltip={help}>i</button></div>
  }

  function renderField(field:string){
    const v=form[field]
    const isId=field===meta.idField
    const options=optionsFor(field)
    const full=LONG_RE.test(field)
    const invalid=Boolean(errors[field])
    const type=NUMBER_RE.test(field)?'number':DATETIME_RE.test(field)?'datetime-local':DATE_RE.test(field)?'date':TIME_RE.test(field)?'time':'text'
    const value=DATETIME_RE.test(field)?toDateTimeLocal(v):DATE_RE.test(field)?inputValue(v).slice(0,10):inputValue(v)
    const base=<>
      {isId&&record ? <input value={inputValue(v)} readOnly />
      : BOOL_FIELDS.has(field) ? <span className="checkline"><input type="checkbox" checked={bool(v)} onChange={(e)=>setField(field,e.target.checked)}/><span><b>{bool(v)?'On':'Off'}</b><small>{helpForField(field,meta)}</small></span></span>
      : options ? <select className={invalid?'invalid':''} value={inputValue(v)} onChange={(e)=>setField(field,e.target.value)}><option value="">— Select —</option>{options.map((o)=><option key={`${o.value}-${o.label}`} value={o.value}>{o.label}</option>)}</select>
      : full ? <textarea className={invalid?'invalid':''} rows={field==='body'||field==='full_info'||field==='full_synopsis'||field==='synopsis'?7:4} value={inputValue(v)} onChange={(e)=>setField(field,e.target.value)} />
      : <div className={field==='slug'?'input-with-action':''}><input className={invalid?'invalid':''} type={type} value={value} placeholder={isId&&!record?'Auto-generated on save':''} onChange={(e)=>setField(field,NUMBER_RE.test(field)&&e.target.value!==''?Number(e.target.value):e.target.value)} />{field==='slug'&&<button type="button" className="secondary mini" onClick={()=>{const source=String(form.title||form.display_name||form.full_name||'');if(source)setField('slug',slugify(source))}}>Generate</button>}</div>}
    </>
    return <label className={`field ${full?'full':''}`} key={field}>{renderLabel(field)}{base}{mediaPreview(field,v)}{errors[field]?<small className="field-error">{errors[field]}</small>:null}</label>
  }

  function renderActionButton(){
    if(!actionMeta) return null
    const labelValue=String(form[actionMeta.label]||'')
    const urlValue=String(form[actionMeta.url]||'')
    const destinations=destinationOptions(collections)
    const known=destinations.some(([value])=>value===urlValue)
    const mode=!urlValue?'none':known?urlValue:'custom'
    return <section className="editor-section action-button-section">
      <div className="editor-section-head"><h3>{actionMeta.title}</h3><p>{actionMeta.description}</p></div>
      <div className="action-builder">
        <div className="action-builder-controls">
          <label className="field"><div className="field-label-row"><span>Button</span><button type="button" className="field-info" data-tooltip="Choose No button to hide the action, or enable it to configure the button." aria-label="About button">i</button></div><select value={urlValue?'show':'none'} onChange={(e)=>{if(e.target.value==='none'){setField(actionMeta.label,'');setField(actionMeta.url,'')}else if(!urlValue){setField(actionMeta.label,labelValue||'Learn more');setField(actionMeta.url,'/')}}}><option value="none">No button</option><option value="show">Show action button</option></select></label>
          {urlValue&&<>
            <label className="field"><div className="field-label-row"><span>Button text</span><button type="button" className="field-info" data-tooltip="The words visitors will see inside the button." aria-label="About button text">i</button></div><input value={labelValue} onChange={(e)=>setField(actionMeta.label,e.target.value)}/></label>
            <label className="field"><div className="field-label-row"><span>Destination</span><button type="button" className="field-info" data-tooltip="Choose an existing page or select Custom URL." aria-label="About destination">i</button></div><select value={mode} onChange={(e)=>{const next=e.target.value;if(next==='none'){setField(actionMeta.url,'')}else if(next==='custom'){setField(actionMeta.url,'https://')}else setField(actionMeta.url,next)}}><option value="none">— Select destination —</option>{destinations.map(([value,label])=><option key={value} value={value}>{label}</option>)}<option value="custom">Custom URL…</option></select></label>
            {!known&&<label className="field full"><div className="field-label-row"><span>Custom URL</span><button type="button" className="field-info" data-tooltip="Paste a full https:// link or type an internal path beginning with /." aria-label="About custom URL">i</button></div><input value={urlValue} onChange={(e)=>setField(actionMeta.url,e.target.value)}/></label>}
          </>}
        </div>
        <div className="button-preview-card"><span>Preview</span>{urlValue?<button type="button" className="primary" onClick={(e)=>e.preventDefault()}>{labelValue||'Action button'}</button>:<div className="button-preview-empty">No action button</div>}<small>{urlValue||'The button is hidden.'}</small></div>
      </div>
    </section>
  }

  function validate(intent:SaveIntent){
    if(intent==='draft') return true
    const next:Record<string,string>={}
    ;(meta.required||[]).forEach((field)=>{
      const value=form[field]
      if(value===undefined||value===null||String(value).trim()==='') next[field]='Required before publishing.'
    })
    setErrors(next)
    if(Object.keys(next).length){
      setTimeout(()=>document.querySelector('.field-error')?.scrollIntoView({behavior:'smooth',block:'center'}),0)
      return false
    }
    return true
  }

  async function submit(intent:SaveIntent){
    if(!validate(intent)) return
    await onSave(form,intent)
  }

  const recordId=record?String(record[meta.idField]||record.id||''):''
  const pubState=record?publicationState(record):'draft'
  return <>
    <div className="modal-backdrop editor-backdrop" onMouseDown={requestClose}>
      <section className="editor-card easy-editor" onMouseDown={(e)=>e.stopPropagation()}>
        <header className="editor-head easy-editor-head"><div><p className="eyebrow">{record?'Edit':'Create'}</p><div className="editor-title-line"><h2>{meta.label}</h2>{meta.publishable&&<span className={`publication-chip publication-${pubState}`}>{labelize(pubState)}</span>}{dirty&&<span className="unsaved-chip">Unsaved changes</span>}</div>{recordId&&<div className="record-id-line"><code>{recordId}</code><button className="plain-copy" type="button" onClick={()=>void navigator.clipboard?.writeText(recordId)}>Copy ID</button></div>}</div><button className="icon-action plain" onClick={requestClose}>×</button></header>
        <div className="editor-body easy-editor-body">
          {meta.publishable&&<div className="required-note"><b>* Required before publishing</b><span>You can still save an incomplete record as Draft.</span></div>}
          {(Object.keys(GROUP_META) as GroupKey[]).map((group)=>{
            const fields=groups[group]
            if(!fields.length) return null
            const info=GROUP_META[group]
            const content=<div className="editor-subgrid">{fields.map(renderField)}</div>
            return group==='advanced'?<details className="editor-section advanced-section" key={group}><summary><div><h3>{info.title}</h3><p>{info.description}</p></div><span>Show fields</span></summary>{content}</details>:<section className="editor-section" key={group}><div className="editor-section-head"><h3>{info.title}</h3><p>{info.description}</p></div>{content}</section>
          })}
          {renderActionButton()}
        </div>
        <footer className="editor-actions easy-editor-actions">
          <div>{record&&onArchive&&<button className="danger-btn" disabled={saving} onClick={()=>setArchive(true)}>Archive</button>}</div>
          <div className="publish-actions"><span className="save-hint">{dirty?'Changes are not saved yet.':'No unsaved changes.'}</span><button className="secondary" disabled={saving} onClick={requestClose}>Close</button>{meta.publishable?<><button className="secondary draft-btn" disabled={saving} onClick={()=>void submit('draft')}>{saving&&<ButtonSpinner/>}Save as Draft</button><button className="primary publish-btn" disabled={saving} onClick={()=>void submit('publish')}>{saving&&<ButtonSpinner/>}{record?'Publish changes':'Publish'}</button></>:<button className="primary" disabled={saving||!dirty} onClick={()=>void submit('save')}>{saving&&<ButtonSpinner/>}{saving?'Saving…':record?'Save changes':'Create record'}</button>}</div>
        </footer>
      </section>
    </div>
    <ConfirmDialog open={discard} title="Discard unsaved changes?" body="Your edits have not been saved yet." confirmLabel="Discard changes" danger onCancel={()=>setDiscard(false)} onConfirm={()=>{setDiscard(false);onClose()}} />
    <ConfirmDialog open={archive} title={`Archive this ${meta.label.toLowerCase()} record?`} body="It will stop appearing publicly. The record will remain in the database for recovery or auditing." confirmLabel="Archive" danger onCancel={()=>setArchive(false)} onConfirm={()=>{setArchive(false);if(record&&onArchive) void onArchive(record)}} />
  </>
}
