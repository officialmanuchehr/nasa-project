// Общий layout: боковая навигация (группы MAIN / HEALTH / AI / MISSION / SYSTEM),
// верхняя панель с миссией и пультом симулятора. На телефоне меню выезжает.
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Activity, BedDouble, Bell, Bot, FileText, Gauge, LogOut, Menu, Radiation, Rocket, Settings, ShieldAlert, User, Users, X,
} from 'lucide-react'
import { useData } from '../../features/health/DataProvider'
import { SimulatorPanel } from './SimulatorPanel'

const NAV = [
  { group: 'Main', items: [
    { to: '/', label: 'Dashboard', icon: Gauge },
    { to: '/monitoring', label: 'Live Monitoring', icon: Activity },
    { to: '/risk', label: 'Risk Detection', icon: ShieldAlert },
  ] },
  { group: 'Health', items: [
    { to: '/sleep', label: 'Sleep Monitoring', icon: BedDouble },
    { to: '/radiation', label: 'Radiation Tracking', icon: Radiation },
    { to: '/reports', label: 'Health Reports', icon: FileText },
  ] },
  { group: 'AI', items: [{ to: '/orbit', label: 'ORBIT AI', icon: Bot }] },
  { group: 'Mission', items: [
    { to: '/mission', label: 'Mission Control', icon: Rocket },
    { to: '/crew', label: 'Crew Members', icon: Users },
  ] },
  { group: 'System', items: [
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/settings', label: 'Settings', icon: Settings },
    { to: '/profile', label: 'Profile', icon: User },
  ] },
]

export function AppLayout() {
  const { mission, alerts, profile, signOut, mode } = useData()
  const [open, setOpen] = useState(false)
  const active = alerts.filter((a) => a.status === 'active').length
  const day = mission ? Math.max(1, Math.ceil((Date.now() - new Date(mission.start_date).getTime()) / 86400_000)) : null

  const nav = (
    <nav className="flex flex-col gap-5 p-4" aria-label="Основная навигация">
      {NAV.map((g) => (
        <div key={g.group}>
          <div className="label-caps mb-2 px-2">{g.group}</div>
          <ul className="flex flex-col gap-0.5">
            {g.items.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${
                      isActive ? 'bg-accent/12 text-accent' : 'text-ink-dim hover:bg-space-800 hover:text-ink'
                    }`
                  }
                >
                  <Icon size={17} aria-hidden />
                  <span className="flex-1">{label}</span>
                  {to === '/notifications' && active > 0 && (
                    <span className="rounded-full bg-high px-1.5 font-mono text-[10px] font-bold text-space-950">{active}</span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )

  return (
    <div className="flex min-h-screen">
      {/* Боковая панель (десктоп) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-space-700 bg-space-950/80 lg:flex">
        <Brand />
        {nav}
        {mode === 'supabase' && (
          <button onClick={signOut} className="mx-4 mb-4 mt-auto flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink-mute hover:text-ink">
            <LogOut size={16} /> Выйти
          </button>
        )}
      </aside>

      {/* Мобильное меню */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 overflow-y-auto border-r border-space-700 bg-space-950">
            <div className="flex items-center justify-between pr-3">
              <Brand />
              <button onClick={() => setOpen(false)} aria-label="Закрыть меню" className="p-2 text-ink-dim">
                <X size={20} />
              </button>
            </div>
            {nav}
            {mode === 'supabase' && (
              <button onClick={signOut} className="mx-4 mb-4 flex items-center gap-2 px-2.5 py-2 text-sm text-ink-mute">
                <LogOut size={16} /> Выйти
              </button>
            )}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-space-700 bg-space-950/85 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <button onClick={() => setOpen(true)} className="p-1 text-ink-dim lg:hidden" aria-label="Открыть меню">
              <Menu size={22} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {mission ? `${mission.mission_code} · ${mission.name}` : 'Миссия не назначена'}
              </div>
              <div className="font-mono text-xs text-ink-mute">
                {day ? `MET: день ${day}` : '—'} · {profile?.display_name ?? '…'} · {new Date().toLocaleDateString('ru-RU')}
              </div>
            </div>
            <SimulatorPanel />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <circle cx="16" cy="16" r="15" fill="#0e1530" stroke="#2c3b72" />
        <circle cx="16" cy="16" r="5" fill="#38bdf8" />
        <ellipse cx="16" cy="16" rx="13" ry="5" fill="none" stroke="#a78bfa" strokeWidth="1.6" transform="rotate(-25 16 16)" />
      </svg>
      <div>
        <div className="text-lg font-bold leading-none tracking-tight">
          StarTime<span className="text-accent">+</span>
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-ink-mute">Crew Health</div>
      </div>
    </div>
  )
}
