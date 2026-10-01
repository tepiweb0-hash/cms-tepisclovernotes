import { useEffect, useState, type FormEvent } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase/client'
import { ButtonSpinner } from '../components/loaders/ButtonSpinner'
import { useToast } from '../context/ToastContext'

export function LoginPage(){
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[loading,setLoading]=useState(false)
  const navigate=useNavigate(),toast=useToast()
  useEffect(()=>onAuthStateChanged(auth,(user)=>{if(user)navigate('/dashboard',{replace:true})}),[navigate])
  async function submit(e:FormEvent){e.preventDefault();setLoading(true);try{await signInWithEmailAndPassword(auth,email.trim(),password);toast.push('success','Welcome back','CMS session started successfully.');navigate('/dashboard')}catch(err){toast.push('error','Sign in failed',err instanceof Error?err.message:'Please check your credentials.')}finally{setLoading(false)}}
  return <main className="login-shell"><form className="login-card" onSubmit={submit}><div className="clover large">✦</div><p className="eyebrow">Private CMS</p><h1>Tepis Clover Notes</h1><p className="muted">Content, media, pages, releases and notifications — without touching the public website code.</p><label>Email<input type="email" autoComplete="email" value={email} onChange={(e)=>setEmail(e.target.value)} required/></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={(e)=>setPassword(e.target.value)} required/></label><button className="primary" disabled={loading}>{loading&&<ButtonSpinner/>}{loading?'Signing in…':'Sign in'}</button></form></main>
}
