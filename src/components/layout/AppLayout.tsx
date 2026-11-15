// Общий layout: боковая навигация (группы MAIN / HEALTH / AI / MISSION / SYSTEM),
// верхняя панель с миссией и пультом симулятора. На телефоне меню выезжает.
import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Activity, BedDouble, Bell, Bot, FileText, Gauge, LogOut, Menu, Orbit, Radiation, Rocket, Settings, ShieldAlert, User, Users, X,
} from 'lucide-react'
import { useData } from '../../features/health/DataProvider'
import { SimulatorPanel } from './SimulatorPanel'
import { locale, tr, useLang } from '../../lib/i18n'

// Функция, а не константа: подписи вычисляются на текущем языке
const NAV = () => [
  { group: tr('Главное', 'Main'), items: [
    { to: '/', label: tr('Панель управления', 'Dashboard'), icon: Gauge },
    { to: '/monitoring', label: tr('Мониторинг', 'Live Monitoring'), icon: Activity },
    { to: '/risk', label: tr('Обнаружение рисков', 'Risk Detection'), icon: ShieldAlert },
  ] },
  { group: tr('Здоровье', 'Health'), items: [
    { to: '/sleep', label: tr('Мониторинг сна', 'Sleep Monitoring'), icon: BedDouble },
    { to: '/radiation', label: tr('Радиация', 'Radiation Tracking'), icon: Radiation },
    { to: '/reports', label: tr('Отчёты', 'Health Reports'), icon: FileText },
  ] },
  { group: 'AI', items: [{ to: '/orbit', label: 'ORBIT AI', icon: Bot }] },
  { group: tr('Миссия', 'Mission'), items: [
    { to: '/mission', label: tr('Центр управления', 'Mission Control'), icon: Rocket },
    { to: '/crew', label: tr('Экипаж', 'Crew Members'), icon: Users },
    { to: '/hazards', label: tr('Факторы риска', 'Space Hazards'), icon: Orbit },
  ] },
  { group: tr('Система', 'System'), items: [
    { to: '/notifications', label: tr('Уведомления', 'Notifications'), icon: Bell },
    { to: '/settings', label: tr('Настройки', 'Settings'), icon: Settings },
    { to: '/profile', label: tr('Профиль', 'Profile'), icon: User },
  ] },
]

export function AppLayout() {
  const { mission, alerts, profile, signOut, mode } = useData()
  const [open, setOpen] = useState(false)
  const active = alerts.filter((a) => a.status === 'active').length

  const nav = (
    <nav className="flex flex-col gap-5 p-4" aria-label={tr('Основная навигация', 'Main navigation')}>
      {NAV().map((g) => (
        <div key={g.group}>
          <div className="label-caps mb-2 px-2 text-[10px]">{g.group}</div>
          <ul className="flex flex-col gap-0.5">
            {g.items.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 border-l-2 px-2.5 py-2 text-sm transition ${
                      isActive ? 'border-nasa-red bg-nasa-blue/30 font-medium text-ink' : 'border-transparent text-ink-dim hover:bg-space-800 hover:text-ink'
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
            <LogOut size={16} /> {tr('Выйти', 'Sign out')}
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
              <button onClick={() => setOpen(false)} aria-label={tr('Закрыть меню', 'Close menu')} className="p-2 text-ink-dim">
                <X size={20} />
              </button>
            </div>
            {nav}
            {mode === 'supabase' && (
              <button onClick={signOut} className="mx-4 mb-4 flex items-center gap-2 px-2.5 py-2 text-sm text-ink-mute">
                <LogOut size={16} /> {tr('Выйти', 'Sign out')}
              </button>
            )}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-space-700 bg-space-950/90 backdrop-blur">
          <div className="flag-stripe" aria-hidden />
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <button onClick={() => setOpen(true)} className="p-1 text-ink-dim lg:hidden" aria-label={tr('Открыть меню', 'Open menu')}>
              <Menu size={22} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="display truncate text-sm font-semibold">
                {mission ? `${mission.mission_code} · ${mission.name}` : tr('Миссия не назначена', 'No mission assigned')}
              </div>
              <div className="truncate font-mono text-xs text-ink-mute">
                {profile?.display_name ?? '…'} · {new Date().toLocaleDateString(locale())}
              </div>
            </div>
            <LangSwitch />
            <SimulatorPanel />
          </div>
          <Telemetry start={mission?.start_date} active={active} />
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/** Переключатель языка RU / EN (выбор сохраняется в браузере). */
function LangSwitch() {
  const { lang, setLang } = useLang()
  return (
    <div className="flex overflow-hidden rounded-md border border-space-600 font-mono text-[11px] font-semibold" role="group" aria-label="Language / Язык">
      {(['ru', 'en'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`px-2.5 py-1.5 uppercase tracking-wider transition ${lang === l ? 'bg-nasa-blue text-white' : 'text-ink-mute hover:bg-space-800 hover:text-ink'}`}
        >
          {l}
        </button>
      ))}
    </div>
  )
}

/** Строка телеметрии: время миссии (MET), UTC, статус связи и предупреждений. Тикает раз в секунду. */
function Telemetry({ start, active }: { start?: string; active: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const pad = (n: number, w = 2) => String(n).padStart(w, '0')
  let met = '—'
  if (start) {
    const s = Math.max(0, Math.floor((now - new Date(start).getTime()) / 1000))
    met = `${pad(Math.floor(s / 86400), 3)}:${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
  }
  const utc = new Date(now).toISOString().slice(11, 19)
  const Item = ({ k, v, cls = 'text-ink' }: { k: string; v: string; cls?: string }) => (
    <span className="whitespace-nowrap">
      <span className="text-ink-mute">{k}</span> <span className={cls}>{v}</span>
    </span>
  )
  return (
    <div className="flex gap-x-6 gap-y-1 overflow-x-auto border-t border-space-700/70 bg-space-900/70 px-4 py-1.5 font-mono text-[11px] tracking-wider sm:px-6">
      <Item k="MET" v={met} cls="text-accent" />
      <Item k="UTC" v={utc} />
      <Item k="LINK" v="NOMINAL" cls="text-ok" />
      <Item k="ALERTS" v={active ? String(active) : 'NONE'} cls={active ? 'text-high' : 'text-ok'} />
      <Item k="DATA" v="SIMULATED" cls="text-accent-2" />
    </div>
  )
}

/** Собственная эмблема-«нашивка» миссии (не логотип NASA). */
function Brand() {
  return (
    <div className="flex items-center gap-3 border-b border-space-700 px-5 py-5">
      <svg viewBox="0 0 32 32" className="h-10 w-10 shrink-0" aria-hidden>
        <circle cx="16" cy="16" r="15" fill="#0b3d91" stroke="#4d8dff" strokeOpacity=".5" />
        <ellipse cx="16" cy="16" rx="14" ry="5" fill="none" stroke="#fff" strokeWidth="1.3" transform="rotate(-28 16 16)" />
        <path d="M16 8l1.9 5.6H24l-4.9 3.6 1.9 5.8-5-3.6-5 3.6 1.9-5.8L8 13.6h6.1z" fill="#fff" />
        <circle cx="25.5" cy="9.5" r="2" fill="#fc3d21" />
      </svg>
      <div>
        <div className="display text-lg font-bold leading-none tracking-[0.08em]">
          StarTime<span className="text-nasa-red">+</span>
        </div>
        <div className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.22em] text-ink-mute">Crew Health · Mission Ops</div>
      </div>
    </div>
  )
}
