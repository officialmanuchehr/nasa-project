// Health Reports: отчёт за день / неделю / месяц (показатели, изменения, предупреждения). Можно распечатать в PDF.
import { useState } from 'react'
import { Printer } from 'lucide-react'
import { useData } from '../features/health/DataProvider'
import { Button, Card, PageHeader, SeverityBadge, SimBadge } from '../components/ui'
import { CATEGORY_LABELS, METRICS, METRIC_TYPES, fmt } from '../features/health/metrics'
import { periodStats } from '../features/health/selectors'
import { locale, tr } from '../lib/i18n'

const PERIODS = {
  day: { get label() { return tr('День', 'Day') }, days: 1 },
  week: { get label() { return tr('Неделя', 'Week') }, days: 7 },
  month: { get label() { return tr('Месяц', 'Month') }, days: 30 },
}
type Period = keyof typeof PERIODS

export default function ReportsPage() {
  const { metrics, sleep, radiation, alerts, profile, mission } = useData()
  const [period, setPeriod] = useState<Period>('week')
  const days = PERIODS[period].days
  const from = Date.now() - days * 86400_000
  const prevFrom = from - days * 86400_000
  const inPeriod = <T,>(xs: T[], key: (x: T) => string) => xs.filter((x) => new Date(key(x)).getTime() >= from)
  const nights = inPeriod(sleep, (s) => s.sleep_start)
  const dose = inPeriod(radiation, (r) => r.recorded_at).reduce((s, r) => s + r.measured_value, 0)
  const periodAlerts = inPeriod(alerts, (a) => a.created_at)

  return (
    <div className="space-y-5">
      <PageHeader
        title={tr('Отчёты о здоровье', 'Health Reports')}
        subtitle={`${profile?.display_name ?? ''} · ${mission?.mission_code ?? ''} · ${new Date(from).toLocaleDateString(locale())} — ${new Date().toLocaleDateString(locale())}`}
        right={
          <div className="flex items-center gap-2 print:hidden">
            <div className="flex rounded-lg border border-space-600 p-0.5">
              {(Object.keys(PERIODS) as Period[]).map((p) => (
                <button key={p} onClick={() => setPeriod(p)} className={`rounded-md px-3 py-1 text-xs ${period === p ? 'bg-accent text-space-950' : 'text-ink-dim'}`}>
                  {PERIODS[p].label}
                </button>
              ))}
            </div>
            <Button variant="ghost" onClick={() => window.print()}>
              <Printer size={15} /> PDF
            </Button>
          </div>
        }
      />
      <SimBadge />
      <Card title={tr('Показатели за период (медиана сравнивается с предыдущим периодом)', 'Metrics for the period (median compared with the previous period)')}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-ink-mute">
              <tr>
                <th className="py-2 font-medium">{tr('Показатель', 'Metric')}</th>
                <th className="font-medium">{tr('Медиана', 'Median')}</th>
                <th className="font-medium">{tr('Изменение', 'Change')}</th>
                <th className="font-medium">{tr('Мин – Макс', 'Min – Max')}</th>
                <th className="font-medium">{tr('Измерений', 'Readings')}</th>
                <th className="font-medium">{tr('Пропуски', 'Gaps')}</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {METRIC_TYPES.map((t) => {
                const s = periodStats(metrics, t, from)
                const prev = periodStats(metrics.filter((m) => new Date(m.recorded_at).getTime() < from), t, prevFrom)
                const info = METRICS[t]
                const delta = s.median !== null && prev.median !== null ? s.median - prev.median : null
                return (
                  <tr key={t} className="border-t border-space-800">
                    <td className="py-2 font-sans">{info.label}</td>
                    <td>{fmt(s.median, info.decimals)} <span className="text-xs text-ink-mute">{info.unit}</span></td>
                    <td className={delta && Math.abs(delta) > 0 ? 'text-medium' : 'text-ink-mute'}>{delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(info.decimals)}`}</td>
                    <td>{fmt(s.min, info.decimals)} – {fmt(s.max, info.decimals)}</td>
                    <td>{s.n}</td>
                    <td className={s.missingPct > 20 ? 'text-high' : ''}>{s.missingPct}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="grid gap-5 md:grid-cols-2">
        <Card title={tr('Сон и радиация', 'Sleep and radiation')}>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-ink-dim">{tr('Ночей в периоде', 'Nights in period')}</dt><dd className="font-mono">{nights.length}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-dim">{tr('Средняя продолжительность сна', 'Average sleep duration')}</dt><dd className="font-mono">{nights.length ? `${Math.round(nights.reduce((s, n) => s + n.duration_minutes, 0) / nights.length)} ${tr('мин', 'min')}` : '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-dim">{tr('Доза радиации за период', 'Radiation dose for the period')}</dt><dd className="font-mono">{dose.toFixed(2)} {tr('мЗв', 'mSv')}</dd></div>
          </dl>
        </Card>
        <Card title={`${tr('Предупреждения за период', 'Alerts in period')} (${periodAlerts.length})`}>
          {periodAlerts.length ? (
            <ul className="space-y-1.5 text-sm">
              {periodAlerts.map((a) => (
                <li key={a.id} className="flex items-center gap-2">
                  <SeverityBadge severity={a.severity} />
                  <span className="flex-1 truncate">{a.title}</span>
                  <span className="text-xs text-ink-mute">{CATEGORY_LABELS[a.category]}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-mute">{tr('Предупреждений не было.', 'No alerts.')}</p>
          )}
        </Card>
      </div>
      <p className="text-xs text-ink-mute">{tr('Отчёт сформирован автоматически из демонстрационных данных и не является медицинским заключением.', 'This report is generated automatically from demo data and is not a medical opinion.')}</p>
    </div>
  )
}
