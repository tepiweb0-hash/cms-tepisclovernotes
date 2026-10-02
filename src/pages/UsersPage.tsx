import { useEffect, useMemo, useState } from 'react'
import { auth } from '../firebase/client'
import { useCmsData } from '../context/CmsDataContext'
import { useToast } from '../context/ToastContext'
import { api } from '../services/api'
import type { CmsRecord } from '../types/cms'
import { NotificationCenter } from '../components/notifications/NotificationCenter'
import { BusyOverlay } from '../components/loaders/BusyOverlay'
import { ConfirmDialog } from '../components/dialogs/ConfirmDialog'

const ROLES=['owner','admin','editor','viewer']

function bool(value:unknown){return value!==false&&String(value??'').toLowerCase()!=='false'}
function value(value:unknown){return value==null?'':String(value)}

function Info({text}:{text:string}){return <button type="button" className="field-info" data-tooltip={text} aria-label="Field information">i</button>}

type FormState={display_name:string;email:string;password:string;role:string;enabled:boolean;notes:string}
const blank:FormState={display_name:'',email:'',password:'',role:'viewer',enabled:true,notes:''}

export function UsersPage(){
  const {collection,upsert}=useCmsData()
  const toast=useToast()
  const users=collection('cms_users')
  const uid=auth.currentUser?.uid||''
  const me=users.find((row)=>String(row.id||row.user_id||'')===uid)
  const isOwner=String(me?.role||'')==='owner'
  const [open,setOpen]=useState(false)
  const [editing,setEditing]=useState<CmsRecord|null>(null)
  const [form,setForm]=useState<FormState>(blank)
  const [saving,setSaving]=useState(false)
  const [disableTarget,setDisableTarget]=useState<CmsRecord|null>(null)
  const [query,setQuery]=useState('')

  useEffect(()=>{
    if(!open) return
    if(editing){
      setForm({display_name:value(editing.display_name),email:value(editing.email),password:'',role:value(editing.role)||'viewer',enabled:bool(editing.enabled),notes:value(editing.notes)})
    }else setForm(blank)
  },[open,editing])

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase()
    if(!q)return users
    return users.filter((row)=>JSON.stringify(row).toLowerCase().includes(q))
  },[users,query])

  function startAdd(){setEditing(null);setOpen(true)}
  function startEdit(row:CmsRecord){setEditing(row);setOpen(true)}
  function close(){if(!saving)setOpen(false)}

  async function save(){
    if(!form.display_name.trim()||!form.email.trim()||!form.role){toast.push('warning','Complete required fields','Display name, email and role are required.');return}
    if(!editing&&form.password.length<8){toast.push('warning','Temporary password required','Use at least 8 characters.');return}
    setSaving(true)
    try{
      let saved:CmsRecord
      if(editing){
        const target=String(editing.id||editing.user_id||'')
        saved=await api.updateUser(target,{display_name:form.display_name.trim(),email:form.email.trim(),role:form.role,enabled:form.enabled,notes:form.notes.trim()})
      }else{
        saved=await api.createUser({display_name:form.display_name.trim(),email:form.email.trim(),password:form.password,role:form.role,enabled:form.enabled,notes:form.notes.trim()})
      }
      upsert('cms_users',saved)
      setOpen(false)
      toast.push('success',editing?'User updated':'User created',editing?'CMS access settings were saved.':'The new user can now sign in with the email and temporary password.')
    }catch(error){toast.push('error',editing?'Update failed':'Unable to add user',error instanceof Error?error.message:'Unknown error.')}
    finally{setSaving(false)}
  }

  async function disableUser(){
    if(!disableTarget)return
    const target=String(disableTarget.id||disableTarget.user_id||'')
    setSaving(true)
    try{const saved=await api.disableUser(target);upsert('cms_users',saved);setDisableTarget(null);setOpen(false);toast.push('success','Access disabled','The user can no longer sign in to the CMS.')}
    catch(error){toast.push('error','Unable to disable user',error instanceof Error?error.message:'Unknown error.')}
    finally{setSaving(false)}
  }

  return <>
    <header className="topbar"><div><p className="eyebrow">Administration</p><h2>CMS Users</h2><p className="top-description">Add people who can sign in, then choose exactly what level of CMS access they receive.</p></div><NotificationCenter/></header>
    {!isOwner?<section className="panel error-state"><h3>Owner access required</h3><p>Only the CMS owner can add or change user accounts.</p></section>:<section className="panel users-panel">
      <div className="users-toolbar"><div><h3>People with CMS access</h3><p className="muted">Adding a user creates both the Firebase login account and the CMS role profile.</p></div><button className="primary" onClick={startAdd}>+ Add User</button></div>
      <div className="search-box users-search"><span>⌕</span><input placeholder="Search users…" value={query} onChange={(e)=>setQuery(e.target.value)}/>{query&&<button onClick={()=>setQuery('')}>×</button>}</div>
      <div className="user-grid">{filtered.map((row)=>{
        const target=String(row.id||row.user_id||'')
        const self=target===uid
        return <article className="user-card" key={target}><div className="user-avatar">{value(row.display_name||row.email).slice(0,1).toUpperCase()}</div><div className="user-card-main"><div className="user-name-row"><strong>{value(row.display_name)||'Unnamed user'}</strong>{self&&<span className="self-chip">You</span>}</div><span>{value(row.email)}</span><div className="user-meta"><b>{value(row.role)||'viewer'}</b><span className={bool(row.enabled)?'access-enabled':'access-disabled'}>{bool(row.enabled)?'Enabled':'Disabled'}</span></div></div><button className="secondary mini" onClick={()=>startEdit(row)}>Edit</button></article>
      })}{!filtered.length&&<div className="empty-state"><strong>No users found</strong><span>Try another search.</span></div>}</div>
    </section>}

    {open&&isOwner&&<div className="modal-backdrop editor-backdrop" onMouseDown={close}><section className="editor-card user-editor" onMouseDown={(e)=>e.stopPropagation()}>
      <header className="editor-head easy-editor-head"><div><p className="eyebrow">{editing?'Edit access':'New CMS account'}</p><h2>{editing?'Edit User':'Add User'}</h2></div><button className="icon-action plain" onClick={close}>×</button></header>
      <div className="editor-body user-editor-body">
        {!editing&&<div className="user-create-note"><b>One-step account creation</b><span>This creates the Firebase Authentication account and the CMS access profile together.</span></div>}
        <div className="editor-subgrid">
          <label className="field"><div className="field-label-row"><span>Display Name <b className="required-mark">*</b></span><Info text="Name shown inside the CMS and audit history."/></div><input value={form.display_name} onChange={(e)=>setForm({...form,display_name:e.target.value})}/></label>
          <label className="field"><div className="field-label-row"><span>Email <b className="required-mark">*</b></span><Info text="Email address the person uses to sign in."/></div><input type="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})}/></label>
          {!editing&&<label className="field"><div className="field-label-row"><span>Temporary Password <b className="required-mark">*</b></span><Info text="At least 8 characters. Give this temporary password securely to the new user."/></div><input type="password" minLength={8} value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})}/><small>Minimum 8 characters.</small></label>}
          <label className="field"><div className="field-label-row"><span>Role <b className="required-mark">*</b></span><Info text="Owner: full control. Admin: manage content. Editor: edit content. Viewer: read-only."/></div><select value={form.role} onChange={(e)=>setForm({...form,role:e.target.value})}>{ROLES.map((role)=><option key={role} value={role}>{role[0].toUpperCase()+role.slice(1)}</option>)}</select></label>
          <label className="field full"><div className="field-label-row"><span>Internal Notes</span><Info text="Optional note for administrators. This is not shown on the public site."/></div><textarea rows={3} value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})}/></label>
          <label className="field full"><div className="field-label-row"><span>Account Access</span><Info text="Disabled accounts cannot sign in to the CMS."/></div><span className="checkline"><input type="checkbox" checked={form.enabled} onChange={(e)=>setForm({...form,enabled:e.target.checked})}/><span><b>{form.enabled?'Enabled':'Disabled'}</b><small>{form.enabled?'This user can sign in according to their role.':'Sign-in will be blocked.'}</small></span></span></label>
        </div>
      </div>
      <footer className="editor-actions easy-editor-actions"><div>{editing&&String(editing.id||editing.user_id||'')!==uid&&bool(editing.enabled)&&<button className="danger-btn" disabled={saving} onClick={()=>setDisableTarget(editing)}>Disable access</button>}</div><div><button className="secondary" disabled={saving} onClick={close}>Cancel</button><button className="primary" disabled={saving} onClick={()=>void save()}>{saving?'Saving…':editing?'Save User':'Create User'}</button></div></footer>
    </section></div>}
    <ConfirmDialog open={Boolean(disableTarget)} title="Disable this CMS user?" body="They will no longer be able to sign in, but their profile and audit history will be kept." confirmLabel="Disable access" danger onCancel={()=>setDisableTarget(null)} onConfirm={()=>void disableUser()}/>
    {saving&&<BusyOverlay title={editing?'Saving user…':'Creating user…'} detail="Updating Firebase Authentication and CMS access."/>}
  </>
}
