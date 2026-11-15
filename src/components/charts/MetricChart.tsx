// График временного ряда показателя + (опционально) личная baseline.
// Пропущенные значения (NULL) показываются разрывом линии — не интерполируются.
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { HealthMetric } from '../../types'
import type { MetricBaseline } from '../../features/risk-detection/engine'
import { isValid } from '../../features/risk-detection/engine'
import { METRICS } from '../../features/health/metrics'
import { locale, tr } from '../../lib/i18n'

export function MetricChart({
  data,
  baseline,
  height = 220,
  hours = 72,
}: {
  data: HealthMetric[]
  baseline?: MetricBaseline
  height?: number
  hours?: number
}) {
  if (!data.length) return <div className="grid place-items-center text-sm text-ink-mute" style={{ height }}>{tr('Нет данных', 'No data')}</div>
  const info = METRICS[data[0].metric_type]
  const since = Date.now() - hours * 3600_000
  const rows = data
    .filter((m) => new Date(m.recorded_at).getTime() >= since)
    .map((m) => ({
      t: new Date(m.recorded_at).getTime(),
      v: isValid(m) ? m.value : null,
      b: baseline ? Number(baseline.hourly[new Date(m.recorded_at).getUTCHours()].toFixed(info.decimals)) : undefined,
    }))
  const fmtTime = (t: number) =>
    new Date(t).toLocaleString(locale(), hours > 30 ? { day: '2-digit', month: '2-digit', hour: '2-digit' } : { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ height }} role="img" aria-label={`${tr('График', 'Chart')}: ${info.label}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="#1c2944" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={fmtTime} stroke="#6d7891" fontSize={11} minTickGap={40} />
          <YAxis stroke="#6d7891" fontSize={11} domain={['auto', 'auto']} width={48} />
          <Tooltip
            contentStyle={{ background: '#080d19', border: '1px solid #2b3c62', borderRadius: 3, fontSize: 12 }}
            labelFormatter={(t) => new Date(Number(t)).toLocaleString(locale())}
            formatter={(v, name) => [v === null ? tr('нет данных', 'no data') : `${v} ${info.unit}`, name === 'b' ? tr('Личная baseline', 'Personal baseline') : info.label]}
          />
          {baseline && <Line type="monotone" dataKey="b" stroke="#6d7891" strokeDasharray="4 4" dot={false} strokeWidth={1.2} isAnimationActive={false} />}
          <Line type="monotone" dataKey="v" stroke={info.color} dot={false} strokeWidth={1.8} connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
