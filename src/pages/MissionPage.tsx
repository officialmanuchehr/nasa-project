// Mission Control (+ Crew Members): информация о миссии, условия среды, экипаж с учётом прав доступа.
import { useData } from '../features/health/DataProvider'
import { Card, Empty, PageHeader, Stat } from '../components/ui'

const FACTORS = [
  ['Космическое излучение', 'Вне защиты атмосферы и магнитосферы Земли экипаж подвергается действию космических лучей и солнечных частиц.'],
  ['Изоляция и замкнутость', 'Длительная работа небольшой командой в ограниченном пространстве влияет на поведенческое здоровье и сон.'],
  ['Удалённость от Земли', 'Задержка связи и ограниченная эвакуация требуют большей автономности экипажа.'],
  ['Изменённая гравитация', 'Микрогравитация и переходы между уровнями гравитации влияют на кости, мышцы и сердечно-сосудистую систему.'],
  ['Замкнутая неблагоприятная среда', 'Качество воздуха, шум, освещение и микробиология обитаемого модуля важны для здоровья.'],
]

export function MissionPage() {
  const { mission } = useData()
  if (!mission)
    return (
      <div>
        <PageHeader title="Mission Control" />
        <Empty>Вы пока не назначены на миссию.</Empty>
      </div>
    )
  const start = new Date(mission.start_date)
  const end = mission.end_date ? new Date(mission.end_date) : null
  const day = Math.max(1, Math.ceil((Date.now() - start.getTime()) / 86400_000))
  const total = end ? Math.ceil((end.getTime() - start.getTime()) / 86400_000) : null
  return (
    <div className="space-y-5">
      <PageHeader title="Mission Control" subtitle={`${mission.mission_code} · ${mission.name}${mission.is_demo ? ' · демонстрационная миссия' : ''}`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Текущий день (MET)" value={String(day)} unit={total ? `из ${total}` : undefined} />
        <Stat label="Старт" value={start.toLocaleDateString('ru-RU')} />
        <Stat label="Окончание" value={end ? end.toLocaleDateString('ru-RU') : '—'} />
        <Stat label="Статус" value={mission.status === 'active' ? 'Активна' : mission.status} />
      </div>
      {total && (
        <div className="panel p-4">
          <div className="mb-2 flex justify-between text-xs text-ink-mute">
            <span>Прогресс миссии</span>
            <span className="font-mono">{Math.min(100, Math.round((day / total) * 100))}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-space-800">
            <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2" style={{ width: `${Math.min(100, (day / total) * 100)}%` }} />
          </div>
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Условия среды">
          {mission.environment_json ? (
            <dl className="space-y-1.5 text-sm">
              {Object.entries(mission.environment_json).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-ink-dim">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <Empty>Нет данных</Empty>
          )}
        </Card>
        <Card title="Факторы космического полёта (из задания NASA)">
          <ul className="space-y-2">
            {FACTORS.map(([k, v]) => (
              <li key={k}>
                <div className="text-sm font-medium">{k}</div>
                <div className="text-xs text-ink-mute">{v}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <CrewList />
    </div>
  )
}

export function CrewPage() {
  return (
    <div>
      <PageHeader title="Crew Members" subtitle="Экипаж миссии (видны только участники с разрешённым доступом)" />
      <CrewList />
    </div>
  )
}

function CrewList() {
  const { crew, profile, viewingId, setViewingId } = useData()
  return (
    <Card title={`Экипаж (${crew.length})`}>
      {crew.length ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {crew.map((c) => (
            <li key={c.profile_id} className="flex items-center gap-3 rounded-lg border border-space-700 p-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-accent/15 font-semibold text-accent">{c.display_name.slice(0, 1)}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {c.display_name} {c.profile_id === profile?.id && <span className="text-xs text-ink-mute">(вы)</span>}
                </div>
                <div className="text-xs text-ink-mute">{c.mission_role}</div>
              </div>
              {profile?.role === 'medical_officer' && (
                <button onClick={() => setViewingId(c.profile_id)} className={`text-xs ${viewingId === c.profile_id ? 'text-accent' : 'text-ink-dim hover:text-ink'}`}>
                  {viewingId === c.profile_id ? 'Просмотр' : 'Открыть'}
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Empty>Нет данных об экипаже или нет прав доступа.</Empty>
      )}
    </Card>
  )
}
