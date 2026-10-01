import { useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { Navigate } from 'react-router-dom'
import { auth } from '../firebase/client'
import { PageSkeleton } from './loaders/PageSkeleton'

export function AuthGuard({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  useEffect(() => onAuthStateChanged(auth, (user) => { setSignedIn(Boolean(user)); setReady(true) }), [])
  if (!ready) return <main className="workspace"><PageSkeleton /></main>
  return signedIn ? <>{children}</> : <Navigate to="/login" replace />
}
