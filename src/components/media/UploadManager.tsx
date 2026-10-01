import { useState } from 'react'
import { api } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { useCmsData } from '../../context/CmsDataContext'
import type { UploadState } from '../../types/cms'

type UploadItem={ id:string; file:File; name:string; progress:number; status:UploadState; error?:string }

type CloudinaryResult={asset_id?:string;public_id:string;secure_url:string;url?:string;format?:string;width?:number;height?:number;bytes?:number;resource_type?:string}

async function toWebP(file:File){
  const bitmap=await createImageBitmap(file)
  const max=2200
  const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height))
  const width=Math.max(1,Math.round(bitmap.width*scale)),height=Math.max(1,Math.round(bitmap.height*scale))
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height
  canvas.getContext('2d',{alpha:true})!.drawImage(bitmap,0,0,width,height);bitmap.close()
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob((b)=>b?resolve(b):reject(new Error('WebP conversion failed.')),'image/webp',.84))
  return {blob,width,height}
}

function uploadCloudinary(url:string,form:FormData,onProgress:(p:number)=>void){
  return new Promise<CloudinaryResult>((resolve,reject)=>{
    const xhr=new XMLHttpRequest();xhr.open('POST',url)
    xhr.upload.onprogress=(event)=>{if(event.lengthComputable)onProgress(Math.round((event.loaded/event.total)*100))}
    xhr.onerror=()=>reject(new Error('Network error while uploading image.'))
    xhr.onload=()=>{
      let body:any={};try{body=JSON.parse(xhr.responseText||'{}')}catch{}
      if(xhr.status>=200&&xhr.status<300)resolve(body as CloudinaryResult)
      else reject(new Error(body?.error?.message||`Cloudinary upload failed (${xhr.status}).`))
    }
    xhr.send(form)
  })
}

export function UploadManager(){
  const [items,setItems]=useState<UploadItem[]>([])
  const [active,setActive]=useState(false)
  const toast=useToast();const {upsert}=useCmsData()
  const patch=(id:string,next:Partial<UploadItem>)=>setItems((current)=>current.map((item)=>item.id===id?{...item,...next}:item))

  async function run(item:UploadItem){
    patch(item.id,{status:'optimizing',progress:2,error:undefined})
    try{
      const converted=await toWebP(item.file)
      patch(item.id,{status:'requesting',progress:5})
      const sig=await api.mediaSignature()
      const clean=item.file.name.replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9._-]+/g,'-')
      const form=new FormData()
      form.append('file',converted.blob,`${clean}.webp`)
      form.append('api_key',sig.apiKey)
      form.append('timestamp',String(sig.timestamp))
      form.append('upload_preset',sig.uploadPreset)
      form.append('signature',sig.signature)
      patch(item.id,{status:'uploading',progress:8})
      const uploaded=await uploadCloudinary(sig.uploadUrl,form,(p)=>patch(item.id,{progress:Math.max(8,p)}))
      patch(item.id,{status:'saving',progress:100})
      const saved=await api.registerMedia({
        title:clean.replace(/[-_]+/g,' '),url:uploaded.secure_url,secure_url:uploaded.secure_url,
        cloudinary_public_id:uploaded.public_id,asset_id:uploaded.asset_id||'',alt_text:clean.replace(/[-_]+/g,' '),
        mime_type:'image/webp',format:uploaded.format||'webp',width:uploaded.width||converted.width,height:uploaded.height||converted.height,
        bytes:uploaded.bytes||converted.blob.size,is_webp:true,status:'ready',uploaded_at:new Date().toISOString(),sort_order:999,enabled:true,
      })
      upsert('media',saved);patch(item.id,{status:'success',progress:100});toast.push('success','Upload successful',`${item.file.name} was added to Media Library.`)
    }catch(e){const message=e instanceof Error?e.message:'Upload failed.';patch(item.id,{status:'error',error:message});toast.push('error','Upload failed',`${item.file.name}: ${message}`)}
  }

  async function select(files:FileList|null){
    if(!files?.length)return
    const created=Array.from(files).map((file)=>({id:crypto.randomUUID(),file,name:file.name,progress:0,status:'optimizing' as UploadState}))
    setItems((current)=>[...created,...current]);setActive(true)
    for(const item of created) await run(item)
    setActive(false)
  }

  const success=items.filter((i)=>i.status==='success').length,error=items.filter((i)=>i.status==='error').length
  return <section className="upload-card"><div className="upload-card-head"><div><p className="eyebrow">Media pipeline</p><h3>Upload → optimize WebP → Cloudinary</h3><p className="muted">Images are resized to a maximum of 2200px, converted to WebP, uploaded with real progress, then registered in Firestore.</p></div><label className={`primary upload-button ${active?'disabled':''}`}>+ Upload images<input hidden disabled={active} type="file" accept="image/*" multiple onChange={(e)=>{void select(e.target.files);e.currentTarget.value='' }}/></label></div>
    {items.length>0&&<><div className="upload-summary"><strong>{active?'Upload in progress':'Upload finished'}</strong><span>{success} successful{error?` · ${error} failed`:''}</span></div><div className="upload-list">{items.map((item)=><div className={`upload-row upload-${item.status}`} key={item.id}><div className="upload-row-top"><div><strong>{item.name}</strong><span>{item.status==='optimizing'?'Optimizing image…':item.status==='requesting'?'Preparing secure upload…':item.status==='uploading'?`Uploading ${item.progress}%`:item.status==='saving'?'Saving media record…':item.status==='success'?'Upload successful':`Upload failed${item.error?` — ${item.error}`:''}`}</span></div>{item.status==='error'&&<button className="secondary mini" onClick={()=>void run(item)}>Retry</button>}</div><div className="progress"><span style={{width:`${item.progress}%`}}/></div></div>)}</div></>}
  </section>
}
