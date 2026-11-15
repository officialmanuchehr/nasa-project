// Mission Control (+ Crew Members): информация о миссии, условия среды, экипаж с учётом прав доступа.
import { useData } from '../features/health/DataProvider'
import { Card, Empty, PageHeader, Stat } from '../components/ui'
import { locale, tr } from '../lib/i18n'

const FACTORS = () => [
  [tr('Космическое излучение', 'Space radiation'), tr('Вне защиты атмосферы и магнитосферы Земли экипаж подвергается действию космических лучей и солнечных частиц.', 'Outside the protection of Earth’s atmosphere and magnetosphere, the crew is exposed to cosmic rays and solar particles.')],
  [tr('Изоляция и замкнутость', 'Isolation and confinement'), tr('Длительная работа небольшой командой в ограниченном пространстве влияет на поведенческое здоровье и сон.', 'Long periods in a small team in a confined space affect behavioral health and sleep.')],
  [tr('Удалённость от Земли', 'Distance from Earth'), tr('Задержка связи и ограниченная эвакуация требуют большей автономности экипажа.', 'Communication delays and limited evacuation demand greater crew autonomy.')],
  [tr('Изменённая гравитация', 'Altered gravity'), tr('Микрогравитация и переходы между уровнями гравитации влияют на кости, мышцы и сердечно-сосудистую систему.', 'Microgravity and transitions between gravity fields affect bones, muscles and the cardiovascular system.')],
  [tr('Замкнутая неблагоприятная среда', 'Hostile, closed environment'), tr('Качество воздуха, шум, освещение и микробиология обитаемого модуля важны для здоровья.', 'Air quality, noise, lighting and habitat microbiology all matter for health.')],
]

export function MissionPage() {
  const { mission } = useData()
  if (!mission)
    return (
      <div>
        <PageHeader title={tr('Центр управления миссией', 'Mission Control')} />
        <Empty>{tr('Вы пока не назначены на миссию.', 'You are not assigned to a mission yet.')}</Empty>
      </div>
    )
  const start = new Date(mission.start_date)
  const end = mission.end_date ? new Date(mission.end_date) : null
  const day = Math.max(1, Math.ceil((Date.now() - start.getTime()) / 86400_000))
  const total = end ? Math.ceil((end.getTime() - start.getTime()) / 86400_000) : null
  return (
    <div className="space-y-5">
      <PageHeader title={tr('Центр управления миссией', 'Mission Control')} subtitle={`${mission.mission_code} · ${mission.name}${mission.is_demo ? tr(' · демонстрационная миссия', ' · demo mission') : ''}`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={tr('Текущий день (MET)', 'Current day (MET)')} value={String(day)} unit={total ? tr(`из ${total}`, `of ${total}`) : undefined} />
        <Stat label={tr('Старт', 'Start')} value={start.toLocaleDateString(locale())} />
        <Stat label={tr('Окончание', 'End')} value={end ? end.toLocaleDateString(locale()) : '—'} />
        <Stat label={tr('Статус', 'Status')} value={mission.status === 'active' ? tr('Активна', 'Active') : mission.status} />
      </div>
      {total && (
        <div className="panel p-4">
          <div className="mb-2 flex justify-between text-xs text-ink-mute">
            <span>{tr('Прогресс миссии', 'Mission progress')}</span>
            <span className="font-mono">{Math.min(100, Math.round((day / total) * 100))}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-space-800">
            <div className="h-full rounded-full bg-gradient-to-r from-nasa-blue to-accent" style={{ width: `${Math.min(100, (day / total) * 100)}%` }} />
          </div>
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={tr('Условия среды', 'Environment')}>
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
            <Empty>{tr('Нет данных', 'No data')}</Empty>
          )}
        </Card>
        <Card title={tr('Факторы космического полёта (из задания NASA)', 'Spaceflight hazards (from the NASA challenge)')}>
          <ul className="space-y-2">
            {FACTORS().map(([k, v]) => (
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
      <PageHeader title={tr('Экипаж', 'Crew Members')} subtitle={tr('Экипаж миссии (видны только участники с разрешённым доступом)', 'Mission crew (only members you have access to are shown)')} />
      <CrewList />
    </div>
  )
}

function CrewList() {
  const { crew, profile, viewingId, setViewingId } = useData()
  return (
    <Card title={`${tr('Экипаж', 'Crew')} (${crew.length})`}>
      {crew.length ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {crew.map((c) => (
            <li key={c.profile_id} className="flex items-center gap-3 rounded-lg border border-space-700 p-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-accent/15 font-semibold text-accent">{c.display_name.slice(0, 1)}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {c.display_name} {c.profile_id === profile?.id && <span className="text-xs text-ink-mute">({tr('вы', 'you')})</span>}
                </div>
                <div className="text-xs text-ink-mute">{c.mission_role}</div>
              </div>
              {profile?.role === 'medical_officer' && (
                <button onClick={() => setViewingId(c.profile_id)} className={`text-xs ${viewingId === c.profile_id ? 'text-accent' : 'text-ink-dim hover:text-ink'}`}>
                  {viewingId === c.profile_id ? tr('Просмотр', 'Viewing') : tr('Открыть', 'Open')}
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Empty>{tr('Нет данных об экипаже или нет прав доступа.', 'No crew data or no access.')}</Empty>
      )}
    </Card>
  )
}
