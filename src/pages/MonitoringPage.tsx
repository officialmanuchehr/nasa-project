// Live Monitoring: графики всех доступных показателей с выбором периода.
import { useState } from 'react'
import { useData } from '../features/health/DataProvider'
import { Card, PageHeader, SimBadge } from '../components/ui'
import { MetricChart } from '../components/charts/MetricChart'
import { METRICS, METRIC_TYPES, fmt } from '../features/health/metrics'
import { ageLabel, byType, latestValid } from '../features/health/selectors'

const RANGES = [
  { h: 6, label: '6 ч' },
  { h: 24, label: '24 ч' },
  { h: 72, label: '3 сут' },
  { h: 168, label: '7 сут' },
  { h: 504, label: '21 сут' },
]

export default function MonitoringPage() {
  const { metrics, engine, live } = useData()
  const [hours, setHours] = useState(24)
  return (
    <div>
      <PageHeader
        title="Live Monitoring"
        subtitle={live ? 'Live-режим: новая точка каждые 10 секунд' : 'Включите Live в «Симуляторе», чтобы видеть поступление данных'}
        right={
          <div className="flex items-center gap-2">
            <SimBadge />
            <div className="flex rounded-lg border border-space-600 p-0.5" role="group" aria-label="Период">
              {RANGES.map((r) => (
                <button key={r.h} onClick={() => setHours(r.h)} className={`rounded-md px-2.5 py-1 text-xs ${hours === r.h ? 'bg-accent text-space-950' : 'text-ink-dim'}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        }
      />
      <div className="grid gap-5 lg:grid-cols-2">
        {METRIC_TYPES.map((t) => {
          const last = latestValid(metrics, t)
          const info = METRICS[t]
          const baseline = t === 'activity' ? undefined : engine?.baselines[t]
          return (
            <Card
              key={t}
              title={info.label}
              action={
                <span className="font-mono text-sm" style={{ color: info.color }}>
                  {fmt(last?.value, info.decimals)} <span className="text-xs text-ink-mute">{info.unit} · {ageLabel(last?.recorded_at)}</span>
                </span>
              }
            >
              <MetricChart data={byType(metrics, t)} baseline={baseline} hours={hours} />
            </Card>
          )
        })}
      </div>
      <p className="mt-4 text-xs text-ink-mute">
        Пунктир — личная baseline по часу суток (первые 7 суток). Разрывы линии — отсутствующие или сомнительные измерения: они не интерполируются.
      </p>
    </div>
  )
}
