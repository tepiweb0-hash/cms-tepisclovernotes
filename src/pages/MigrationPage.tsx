import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { auth } from '../firebase/client'
import { api } from '../services/api'
import { useCmsData } from '../context/CmsDataContext'
import { useToast } from '../context/ToastContext'
import { ButtonSpinner } from '../components/loaders/ButtonSpinner'

type SheetDef = { sheet:string; collection:string; idField?:string; composite?:boolean }
type ParsedSheet = SheetDef & { records:Record<string,unknown>[]; totalRows:number; skippedRows:number; status:'ready'|'importing'|'success'|'error'; error?:string }

const SHEET_DEFS: SheetDef[] = [
  {sheet:'SITE_SETTINGS',collection:'site_settings',idField:'key'},
  {sheet:'UI_TEXT',collection:'ui_text',idField:'key'},
  {sheet:'THEME',collection:'theme',idField:'token'},
  {sheet:'FONTS',collection:'fonts',idField:'font_id'},
  {sheet:'NAVIGATION',collection:'navigation',idField:'nav_id'},
  {sheet:'SOCIALS',collection:'socials',idField:'social_id'},
  {sheet:'MESSAGE_LINKS',collection:'message_links',idField:'link_id'},
  {sheet:'PAGES',collection:'pages',idField:'page_id'},
  {sheet:'SECTIONS',collection:'sections',idField:'section_id'},
  {sheet:'SECTION_ITEMS',collection:'section_items',idField:'item_id'},
  {sheet:'MEDIA',collection:'media',idField:'media_id'},
  {sheet:'ARTISTS',collection:'artists',idField:'artist_id'},
  {sheet:'ARTIST_TIMELINE',collection:'artist_timeline',idField:'timeline_id'},
  {sheet:'ARTIST_ACHIEVEMENTS',collection:'artist_achievements',idField:'achievement_id'},
  {sheet:'SERIES',collection:'series',idField:'series_id'},
  {sheet:'SERIES_CAST',collection:'series_cast',idField:'cast_id'},
  {sheet:'EPISODES',collection:'episodes',idField:'episode_id'},
  {sheet:'EPISODE_CAST',collection:'episode_cast',idField:'episode_cast_id'},
  {sheet:'GALLERIES',collection:'galleries',idField:'gallery_item_id'},
  {sheet:'GALLERY_SETTINGS',collection:'gallery_settings',idField:'gallery_setting_id'},
  {sheet:'NEWS',collection:'news',idField:'news_id'},
  {sheet:'EVENTS',collection:'events',idField:'event_id'},
  {sheet:'NOTIFICATIONS',collection:'notifications',idField:'notification_id'},
  {sheet:'HOME_FEATURES',collection:'home_features',idField:'feature_id'},
  {sheet:'REDIRECTS',collection:'redirects',idField:'redirect_id'},
  {sheet:'LOOKUPS',collection:'lookups',composite:true},
]

const SKIPPED_SHEETS = new Set(['README','APPS_SCRIPT_SETUP','CMS_USERS','CHANGE_LOG'])

function cleanRecord(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  Object.entries(row).forEach(([rawKey,value])=>{
    const key=String(rawKey||'').trim()
    if(!key || key.startsWith('__')) return
    if(value instanceof Date){
      const yyyy=value.getFullYear(), mm=String(value.getMonth()+1).padStart(2,'0'), dd=String(value.getDate()).padStart(2,'0')
      out[key]=`${yyyy}-${mm}-${dd}`
      return
    }
    out[key]=value ?? ''
  })
  return out
}

function validRecord(def: SheetDef, row: Record<string, unknown>) {
  if(def.composite) return String(row.group||'').trim() !== '' && String(row.value||'').trim() !== ''
  return String(row[def.idField || 'id'] || '').trim() !== ''
}

function recordId(def: SheetDef,row:Record<string,unknown>){
  if(def.composite) return `${String(row.group||'')}__${String(row.value||'')}`
  return String(row[def.idField || 'id'] || '')
}

export function MigrationPage(){
  const {collection,refresh}=useCmsData()
  const toast=useToast()
  const [fileName,setFileName]=useState('')
  const [sheets,setSheets]=useState<ParsedSheet[]>([])
  const [ignored,setIgnored]=useState<string[]>([])
  const [parsing,setParsing]=useState(false)
  const [migrating,setMigrating]=useState(false)
  const [completed,setCompleted]=useState(0)

  const uid=auth.currentUser?.uid
  const profile=collection('cms_users').find((row)=>String(row.id||row.user_id||'')===String(uid||''))
  const isOwner=String(profile?.role||'')==='owner'
  const totalRecords=useMemo(()=>sheets.reduce((sum,s)=>sum+s.records.length,0),[sheets])
  const migratedRecords=useMemo(()=>sheets.filter((s)=>s.status==='success').reduce((sum,s)=>sum+s.records.length,0),[sheets])
  const progress=totalRecords ? Math.round((migratedRecords/totalRecords)*100) : 0

  async function chooseFile(file?:File){
    if(!file)return
    setParsing(true);setFileName(file.name);setSheets([]);setIgnored([]);setCompleted(0)
    try{
      const buffer=await file.arrayBuffer()
      const workbook=XLSX.read(buffer,{type:'array',cellDates:true})
      const parsed:ParsedSheet[]=[]
      const ignoredNames:string[]=[]

      for(const name of workbook.SheetNames){
        if(SKIPPED_SHEETS.has(name)){ignoredNames.push(`${name} (intentionally skipped)`);continue}
        const def=SHEET_DEFS.find((item)=>item.sheet===name)
        if(!def){ignoredNames.push(`${name} (not part of CMS migration)`);continue}
        const ws=workbook.Sheets[name]
        const raw=XLSX.utils.sheet_to_json<Record<string,unknown>>(ws,{defval:'',raw:true})
        const cleaned=raw.map(cleanRecord)
        const valid=cleaned.filter((row)=>validRecord(def,row))
        const seen=new Set<string>(); const unique:Record<string,unknown>[]=[]
        for(const row of valid){
          const id=recordId(def,row)
          if(seen.has(id)) throw new Error(`${name} contains a duplicate ID: ${id}`)
          seen.add(id); unique.push(row)
        }
        parsed.push({...def,records:unique,totalRows:raw.length,skippedRows:raw.length-unique.length,status:'ready'})
      }
      setSheets(parsed);setIgnored(ignoredNames)
      toast.push('success','Workbook ready',`${parsed.reduce((n,s)=>n+s.records.length,0)} records are ready to migrate.`)
    }catch(e){
      setSheets([])
      toast.push('error','Unable to read workbook',e instanceof Error?e.message:'Unknown workbook error.')
    }finally{setParsing(false)}
  }

  async function migrate(){
    if(!isOwner){toast.push('error','Owner access required');return}
    if(!sheets.length || !totalRecords){toast.push('warning','No records to migrate');return}
    setMigrating(true);setCompleted(0)
    let failures=0
    for(let i=0;i<sheets.length;i++){
      const sheet=sheets[i]
      if(!sheet.records.length){
        setSheets((current)=>current.map((s,index)=>index===i?{...s,status:'success'}:s));setCompleted((n)=>n+1);continue
      }
      setSheets((current)=>current.map((s,index)=>index===i?{...s,status:'importing',error:undefined}:s))
      try{
        for(let start=0;start<sheet.records.length;start+=400){
          await api.migrateSheet(sheet.sheet,sheet.records.slice(start,start+400))
        }
        setSheets((current)=>current.map((s,index)=>index===i?{...s,status:'success'}:s))
      }catch(e){
        failures++
        const message=e instanceof Error?e.message:'Migration failed.'
        setSheets((current)=>current.map((s,index)=>index===i?{...s,status:'error',error:message}:s))
      }
      setCompleted((n)=>n+1)
    }
    await refresh()
    setMigrating(false)
    if(failures) toast.push('warning','Migration finished with errors',`${failures} sheet(s) need attention.`)
    else toast.push('success','Migration complete',`${totalRecords} records were imported to Firestore.`)
  }

  if(!isOwner)return <><header className="topbar"><div><p className="eyebrow">Administration</p><h2>Database Migration</h2></div></header><section className="panel error-state"><h3>Owner access required</h3><p>Only the CMS owner can import a workbook into Firestore.</p></section></>

  return <>
    <header className="topbar"><div><p className="eyebrow">Administration</p><h2>Database Migration</h2><p className="top-description">Import the existing Google Sheets workbook into Firestore while preserving record IDs and relationships.</p></div></header>
    <section className="panel migration-panel">
      <div className="migration-intro">
        <div><p className="eyebrow">Google Sheets → Firestore</p><h3>Choose the full Excel workbook</h3><p className="muted">Existing Firestore documents with the same ID are updated. CMS_USERS and CHANGE_LOG are intentionally skipped so your Firebase owner account and new audit history stay intact.</p></div>
        <label className={`primary upload-button ${parsing||migrating?'disabled':''}`}>{parsing?<><ButtonSpinner/>Reading workbook…</>:'Choose .xlsx file'}<input type="file" accept=".xlsx,.xls" hidden disabled={parsing||migrating} onChange={(e)=>void chooseFile(e.target.files?.[0])}/></label>
      </div>

      {fileName && <div className="migration-summary"><div><span>Selected workbook</span><strong>{fileName}</strong></div><div><span>Detected sheets</span><strong>{sheets.length}</strong></div><div><span>Importable records</span><strong>{totalRecords}</strong></div><div><span>Ignored sheets</span><strong>{ignored.length}</strong></div></div>}

      {migrating && <div className="migration-progress"><div className="migration-progress-head"><strong>Migrating database…</strong><span>{completed}/{sheets.length} sheets · {progress}%</span></div><div className="progress"><span style={{width:`${progress}%`}}/></div></div>}

      {!!sheets.length && <div className="migration-table-wrap"><table><thead><tr><th>Sheet</th><th>Firestore collection</th><th>Records</th><th>Skipped rows</th><th>Status</th></tr></thead><tbody>{sheets.map((sheet)=><tr key={sheet.sheet}><td><strong>{sheet.sheet}</strong>{sheet.error&&<small className="migration-error">{sheet.error}</small>}</td><td><code>{sheet.collection}</code></td><td>{sheet.records.length}</td><td>{sheet.skippedRows}</td><td><span className={`migration-status status-${sheet.status}`}>{sheet.status==='ready'?'Ready':sheet.status==='importing'?'Importing…':sheet.status==='success'?'Imported':'Failed'}</span></td></tr>)}</tbody></table></div>}

      {!!ignored.length && <details className="migration-ignored"><summary>Ignored sheets ({ignored.length})</summary><div>{ignored.map((name)=><code key={name}>{name}</code>)}</div></details>}

      {!!sheets.length && <div className="migration-actions"><div><p><strong>Safe import:</strong> record IDs are preserved and duplicate IDs inside the workbook are blocked before migration.</p><p className="muted">Media records keep their current Google Drive URLs for now. We can migrate the actual image files to Cloudinary separately after the database is confirmed.</p></div><button className="primary" disabled={migrating||parsing||!totalRecords} onClick={()=>void migrate()}>{migrating?<><ButtonSpinner/>Migrating…</>:'Start Migration'}</button></div>}
    </section>
  </>
}
