import { Navigate, Route, Routes } from 'react-router-dom'
import { CmsLayout } from './layouts/CmsLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { MediaPage } from './pages/MediaPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { AuthGuard } from './components/AuthGuard'

export default function App(){ return <Routes><Route path="/login" element={<LoginPage/>}/><Route element={<AuthGuard><CmsLayout/></AuthGuard>}><Route path="/dashboard" element={<DashboardPage/>}/><Route path="/media" element={<MediaPage/>}/>{['home','artists','series','episodes','events','news','notifications','site','theme','users','audit'].map((path)=><Route key={path} path={`/${path}`} element={<PlaceholderPage/>}/>)}</Route><Route path="*" element={<Navigate to="/dashboard" replace/>}/></Routes> }
