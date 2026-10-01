import { FormEvent, useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase/client'
import { ButtonSpinner } from '../components/loaders/ButtonSpinner'
import { useToast } from '../context/ToastContext'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate(); const toast = useToast()
  async function submit(e: FormEvent) {
    e.preventDefault(); setLoading(true)
    try { await signInWithEmailAndPassword(auth, email, password); toast.push('success','Welcome back'); navigate('/dashboard') }
    catch (err) { toast.push('error','Sign in failed', err instanceof Error ? err.message : 'Please check your credentials.') }
    finally { setLoading(false) }
  }
  return <main className="login-shell"><form className="login-card" onSubmit={submit}><div className="clover large">✦</div><p className="eyebrow">Private CMS</p><h1>Tepis Clover Notes</h1><p>Manage content, media, releases and website settings.</p><label>Email<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required /></label><label>Password<input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required /></label><button className="primary" disabled={loading}>{loading && <ButtonSpinner />}{loading ? 'Signing in…' : 'Sign in'}</button></form></main>
}
