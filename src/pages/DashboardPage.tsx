// Dashboard: миссия, последние показатели, оценка по категориям, активные предупреждения,
// тенденции и самоотчёт о самочувствии.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, CircleDashed, AlertTriangle } from 'lucide-react'
import { useData } from '../features/health/DataProvider'
import { Card, Disclaimer, Empty, PageHeader, SeverityBadge, SimBadge, Stat, Button } from '../components/ui'
import { AlertCard } from '../components/alerts/AlertCard'
import { MetricChart } from '../components/charts/MetricChart'
import { CATEGORY_LABELS, METRICS, fmt } from '../features/health/metrics'
import { ageLabel, byType, dailyDose, latestValid } from '../features/health/selectors'
import type { MetricType } from '../types'

const TILES: MetricType[] = ['heart_rate', 'spo2', 'body_temp', 'systolic_bp']

export default function DashboardPage() {
  const { metrics, sleep, radiation, alerts, engine, acknowledge, mission, loading, error } = useData()
  const active = alerts.filter((a) => a.status !== 'resolved')
  const lastSleep = sleep[sleep.length - 1]
  const dose = dailyDose(radiation)
  const anySim = metrics.some((m) => m.is_simulated)

  return (
    <div className="space-y-5">
      <PageHeader title="Dashboard" subtitle="Обзор состояния астронавта и миссии" right={anySim ? <SimBadge /> : undefined} />
      <Disclaimer />
      {error && <div className="rounded-lg border border-critical/40 bg-critical/10 px-3 py-2 text-sm text-critical">Ошибка: {error}</div>}
      {loading && <p className="text-sm text-ink-mute">Загрузка данных…</p>}

      {!metrics.length && !loading ? (
        <Empty>Данных пока нет. Откройте «Симулятор» вверху и выберите сценарий, чтобы сгенерировать демонстрационную историю.</Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {TILES.map((t) => {
              const m = latestValid(metrics, t)
              const info = METRICS[t]
              const dia = t === 'systolic_bp' ? latestValid(metrics, 'diastolic_bp') : null
              return (
                <Stat
                  key={t}
                  label={t === 'systolic_bp' ? 'Давление' : info.label}
                  value={t === 'systolic_bp' ? `${fmt(m?.value)}/${fmt(dia?.value)}` : fmt(m?.value, info.decimals)}
                  unit={info.unit}
                  color={info.color}
                  hint={<span>{ageLabel(m?.recorded_at)}{m?.is_simulated && ' · симуляция'}</span>}
                />
              )
            })}
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card title="Оценка по категориям" className="lg:col-span-1" action={<Link to="/risk" className="text-xs text-accent">Подробнее →</Link>}>
              <ul className="space-y-2.5">
                {engine?.assessments.map((a) => (
                  <li key={a.category} className="flex items-start gap-2.5">
                    {a.status === 'ok' ? (
                      <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-ok" aria-label="В норме относительно baseline" />
                    ) : a.status === 'attention' ? (
                      <AlertTriangle size={17} className="mt-0.5 shrink-0 text-medium" aria-label="Требует внимания" />
                    ) : (
                      <CircleDashed size={17} className="mt-0.5 shrink-0 text-ink-mute" aria-label="Недостаточно данных" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {CATEGORY_LABELS[a.category]} {a.severity && <SeverityBadge severity={a.severity} />}
                      </div>
                      <div className="text-xs text-ink-mute">{a.explanation}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title={`Активные предупреждения (${active.length})`} className="lg:col-span-2" action={<Link to="/notifications" className="text-xs text-accent">Все →</Link>}>
              {active.length ? (
                <div className="space-y-2.5">
                  {active.slice(0, 4).map((a) => (
                    <AlertCard key={a.id} alert={a} onAck={acknowledge} compact />
                  ))}
                </div>
              ) : (
                <Empty>Активных предупреждений нет.</Empty>
              )}
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Пульс · 72 ч (пунктир — личная baseline)">
              <MetricChart data={byType(metrics, 'heart_rate')} baseline={engine?.baselines.heart_rate} />
            </Card>
            <Card title="Температура тела · 72 ч">
              <MetricChart data={byType(metrics, 'body_temp')} baseline={engine?.baselines.body_temp} />
            </Card>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <Card title="Последний сон">
              {lastSleep ? (
                <div>
                  <div className="font-mono text-3xl font-semibold">
                    {Math.floor(lastSleep.duration_minutes / 60)}ч {lastSleep.duration_minutes % 60}м
                  </div>
                  <div className="mt-1 text-xs text-ink-mute">
                    Пробуждений: {lastSleep.quality_data?.awakenings ?? '—'} · {lastSleep.is_simulated ? 'симуляция' : lastSleep.data_source}
                  </div>
                </div>
              ) : (
                <Empty>Нет данных о сне</Empty>
              )}
            </Card>
            <Card title="Радиация · накопленная доза">
              {dose.length ? (
                <div>
                  <div className="font-mono text-3xl font-semibold text-medium">
                    {dose[dose.length - 1].cumulative.toFixed(2)} <span className="text-sm text-ink-mute">мЗв</span>
                  </div>
                  <div className="mt-1 text-xs text-ink-mute">за {dose.length} сут. наблюдения · симуляция дозиметра</div>
                </div>
              ) : (
                <Empty>Нет измерений дозиметра</Empty>
              )}
            </Card>
            <SelfReport />
          </div>
          {mission && <p className="text-xs text-ink-mute">Миссия {mission.mission_code} · данные из {metrics.some((m) => !m.is_simulated) ? 'датчиков и симулятора' : 'симулятора'}</p>}
        </>
      )}
    </div>
  )
}

function SelfReport() {
  const { addSymptom } = useData()
  const [cat, setCat] = useState('Усталость')
  const [text, setText] = useState('')
  const [intensity, setIntensity] = useState(3)
  const [sent, setSent] = useState(false)
  return (
    <Card title="Самочувствие (самоотчёт)">
      <form
        className="space-y-2"
        onSubmit={async (e) => {
          e.preventDefault()
          await addSymptom(cat, text.trim() || '—', intensity)
          setText('')
          setSent(true)
          setTimeout(() => setSent(false), 2500)
        }}
      >
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="w-full rounded-lg border border-space-600 bg-space-900 px-2 py-1.5 text-sm" aria-label="Категория">
          {['Усталость', 'Головная боль', 'Тошнота', 'Боль в спине', 'Нарушение зрения', 'Тревожность', 'Другое'].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="Комментарий (необязательно)" className="w-full rounded-lg border border-space-600 bg-space-900 px-2 py-1.5 text-sm" />
        <label className="flex items-center gap-2 text-xs text-ink-dim">
          Интенсивность
          <input type="range" min={0} max={10} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} className="flex-1 accent-sky-400" />
          <span className="w-8 font-mono text-ink">{intensity}/10</span>
        </label>
        <Button type="submit" variant="ghost" className="w-full">
          {sent ? 'Сохранено ✓' : 'Отправить'}
        </Button>
      </form>
    </Card>
  )
}
