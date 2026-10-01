import { onAuthStateChanged, type User } from 'firebase/auth'
import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { auth } from '../firebase/client'
import { PageSkeleton } from './loaders/PageSkeleton'

export function AuthGuard({children}:{children:ReactNode}){
  const [user,setUser]=useState<User|null|undefined>(undefined)
  useEffect(()=>onAuthStateChanged(auth,setUser),[])
  if(user===undefined) return <main className="auth-loading"><PageSkeleton/></main>
  if(!user) return <Navigate to="/login" replace/>
  return <>{children}</>
}
