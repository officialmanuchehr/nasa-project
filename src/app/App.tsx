// Корневой компонент: провайдер данных + маршруты. Без входа (при настроенном Supabase) — страница логина.
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DataProvider, useData } from '../features/health/DataProvider'
import { AppLayout } from '../components/layout/AppLayout'
import DashboardPage from '../pages/DashboardPage'
import MonitoringPage from '../pages/MonitoringPage'
import RiskDetectionPage from '../pages/RiskDetectionPage'
import SleepPage from '../pages/SleepPage'
import RadiationPage from '../pages/RadiationPage'
import OrbitAIPage from '../pages/OrbitAIPage'
import { CrewPage, MissionPage } from '../pages/MissionPage'
import ReportsPage from '../pages/ReportsPage'
import NotificationsPage from '../pages/NotificationsPage'
import { ProfilePage, SettingsPage } from '../pages/SettingsPage'
import LoginPage from '../pages/LoginPage'

function Gate() {
  const { mode, session, authReady } = useData()
  if (!authReady) return <div className="grid min-h-screen place-items-center text-sm text-ink-mute">Загрузка…</div>
  if (mode === 'supabase' && !session) return <LoginPage />
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="monitoring" element={<MonitoringPage />} />
        <Route path="risk" element={<RiskDetectionPage />} />
        <Route path="sleep" element={<SleepPage />} />
        <Route path="radiation" element={<RadiationPage />} />
        <Route path="orbit" element={<OrbitAIPage />} />
        <Route path="mission" element={<MissionPage />} />
        <Route path="crew" element={<CrewPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <Gate />
      </DataProvider>
    </BrowserRouter>
  )
}
