// Settings + Profile: источник данных, симулятор, параметры движка, профиль и роль.
import { useData } from '../features/health/DataProvider'
import { Card, Disclaimer, PageHeader } from '../components/ui'
import { CONFIG, RULESET_VERSION } from '../features/risk-detection/engine'
import { SCENARIOS } from '../features/simulator/simulator'

const ROLE: Record<string, string> = { astronaut: 'Астронавт', medical_officer: 'Врач миссии', admin: 'Администратор' }

export function SettingsPage() {
  const { mode, scenario, live } = useData()
  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Источник данных, симулятор и параметры анализа" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Источник данных">
          <p className="text-sm">
            {mode === 'supabase' ? (
              <>Подключено к <b>Supabase</b>: авторизация, PostgreSQL с RLS и Realtime.</>
            ) : (
              <>Автономный <b>демо-режим</b> без регистрации: данные генерирует симулятор прямо в браузере. Подключение Supabase (вход, БД с RLS, Realtime) включается переменной VITE_USE_SUPABASE=true.</>
            )}
          </p>
          <p className="mt-2 text-sm text-ink-dim">
            Сценарий симулятора: <b className="text-ink">{SCENARIOS[scenario].label}</b> · Live: {live ? 'включён' : 'выключен'}
          </p>
          <p className="mt-2 text-xs text-ink-mute">Подключение реальных датчиков — следующий этап: записи будут приходить с data_source = 'sensor'.</p>
        </Card>
        <Card title={`Risk Engine · ${RULESET_VERSION}`}>
          <pre className="overflow-x-auto rounded-lg bg-space-950 p-3 font-mono text-[11px] text-ink-dim">{JSON.stringify(CONFIG, null, 2)}</pre>
          <p className="mt-2 text-xs text-ink-mute">Демо-параметры чувствительности. Перед реальным использованием их согласовывают со специалистами.</p>
        </Card>
      </div>
      <Disclaimer />
    </div>
  )
}

export function ProfilePage() {
  const { profile, session, mission, mode } = useData()
  return (
    <div className="space-y-5">
      <PageHeader title="Profile" />
      <Card>
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-accent/15 text-xl font-semibold text-accent">{profile?.display_name.slice(0, 1) ?? '?'}</div>
          <div>
            <div className="text-lg font-semibold">{profile?.display_name}</div>
            <div className="text-sm text-ink-dim">{ROLE[profile?.role ?? 'astronaut']} · {mission?.mission_code ?? 'без миссии'}</div>
            {session?.user.email && <div className="text-xs text-ink-mute">{session.user.email}</div>}
          </div>
        </div>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="label-caps">Роль</dt><dd>{ROLE[profile?.role ?? 'astronaut']}</dd></div>
          <div><dt className="label-caps">Режим</dt><dd>{mode === 'supabase' ? 'Supabase' : 'Демо'}</dd></div>
        </dl>
        <p className="mt-4 text-xs text-ink-mute">
          Права доступа: астронавт видит только свои данные; врач миссии — участников назначенной миссии; администратор управляет
          конфигурацией без доступа к медицинским данным. Права проверяются политиками RLS в базе данных.
        </p>
      </Card>
    </div>
  )
}
