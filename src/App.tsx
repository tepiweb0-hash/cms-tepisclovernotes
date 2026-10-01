import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { MediaPage } from './pages/MediaPage'
import { ContentPage } from './pages/ContentPage'
import { MigrationPage } from './pages/MigrationPage'
import { CmsLayout } from './layouts/CmsLayout'
import { AuthGuard } from './components/AuthGuard'
import { CmsDataProvider } from './context/CmsDataContext'

export default function App(){
  return <Routes>
    <Route path="/login" element={<LoginPage/>}/>
    <Route element={<AuthGuard><CmsDataProvider><CmsLayout/></CmsDataProvider></AuthGuard>}>
      <Route path="/dashboard" element={<DashboardPage/>}/>
      <Route path="/home" element={<ContentPage page="home"/>}/>
      <Route path="/artists" element={<ContentPage page="artists"/>}/>
      <Route path="/series" element={<ContentPage page="series"/>}/>
      <Route path="/episodes" element={<ContentPage page="episodes"/>}/>
      <Route path="/events" element={<ContentPage page="events"/>}/>
      <Route path="/news" element={<ContentPage page="news"/>}/>
      <Route path="/notifications" element={<ContentPage page="notifications"/>}/>
      <Route path="/media" element={<MediaPage/>}/>
      <Route path="/site" element={<ContentPage page="site"/>}/>
      <Route path="/theme" element={<ContentPage page="theme"/>}/>
      <Route path="/users" element={<ContentPage page="users"/>}/>
      <Route path="/migration" element={<MigrationPage/>}/>
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
  </Routes>
}
