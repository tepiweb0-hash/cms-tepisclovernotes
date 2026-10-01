import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../services/api'
import type { CmsBootstrap, CmsRecord } from '../types/cms'
import { useToast } from './ToastContext'

type Ctx = {
  data:CmsBootstrap | null
  loading:boolean
  error:string
  refresh:()=>Promise<void>
  collection:(name:string)=>CmsRecord[]
  upsert:(name:string,record:CmsRecord)=>void
  markArchived:(name:string,id:string)=>void
}

const CmsDataContext=createContext<Ctx|null>(null)

export function CmsDataProvider({children}:{children:ReactNode}){
  const [data,setData]=useState<CmsBootstrap|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const toast=useToast()

  async function refresh(){
    setLoading(true); setError('')
    try{ setData(await api.bootstrap()) }
    catch(e){ const msg=e instanceof Error?e.message:'Unable to load CMS data.'; setError(msg); toast.push('error','Unable to load CMS',msg) }
    finally{ setLoading(false) }
  }

  useEffect(()=>{ void refresh() },[])

  function collection(name:string){ return data?.collections?.[name] || [] }
  function upsert(name:string,record:CmsRecord){
    setData((current)=>{
      if(!current) return current
      const rows=current.collections[name] || []
      const id=String(record.id || '')
      const index=rows.findIndex((row)=>String(row.id||'')===id)
      const next=index>=0 ? rows.map((row,i)=>i===index?record:row) : [record,...rows]
      return {...current,collections:{...current.collections,[name]:next}}
    })
  }
  function markArchived(name:string,id:string){
    setData((current)=>{
      if(!current) return current
      const rows=current.collections[name] || []
      return {...current,collections:{...current.collections,[name]:rows.map((row)=>String(row.id)===id?{...row,enabled:false,status:'archived'}:row)}}
    })
  }

  const value=useMemo(()=>({data,loading,error,refresh,collection,upsert,markArchived}),[data,loading,error])
  return <CmsDataContext.Provider value={value}>{children}</CmsDataContext.Provider>
}

export function useCmsData(){
  const value=useContext(CmsDataContext)
  if(!value) throw new Error('useCmsData must be used inside CmsDataProvider')
  return value
}
