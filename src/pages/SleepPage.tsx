// Sleep Monitoring: продолжительность и регулярность сна относительно личной истории.
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '../features/health/DataProvider'
import { Card, Empty, PageHeader, SimBadge, Stat } from '../components/ui'
import { CONFIG, median } from '../features/risk-detection/engine'
import { locale, tr } from '../lib/i18n'

function sd(xs: number[]) {
  const m = xs.reduce((s, x) => s + x, 0) / xs.length
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length)
}
const hm = (min: number) => `${Math.floor(min / 60)}${tr('ч', 'h')} ${Math.round(min % 60)}${tr('м', 'm')}`

export default function SleepPage() {
  const { sleep } = useData()
  if (!sleep.length)
    return (
      <div>
        <PageHeader title={tr('Мониторинг сна', 'Sleep Monitoring')} />
        <Empty>{tr('Нет данных о сне.', 'No sleep data.')}</Empty>
      </div>
    )
  const baseline = median(sleep.slice(0, CONFIG.sleepBaselineNights).map((s) => s.duration_minutes))
  const rows = sleep.map((s) => ({ day: new Date(s.sleep_start).toLocaleDateString(locale(), { day: '2-digit', month: '2-digit' }), h: Number((s.duration_minutes / 60).toFixed(2)), aw: s.quality_data?.awakenings ?? null }))
  const last7 = sleep.slice(-7)
  // Регулярность: разброс времени засыпания (мин), с учётом перехода через полночь
  const onset = (s: (typeof sleep)[number]) => {
    const d = new Date(s.sleep_start)
    const m = d.getUTCHours() * 60 + d.getUTCMinutes()
    return m < 12 * 60 ? m + 1440 : m
  }
  const regBase = sd(sleep.slice(0, CONFIG.sleepBaselineNights).map(onset))
  const regNow = sd(last7.map(onset))
  return (
    <div className="space-y-5">
      <PageHeader title={tr('Мониторинг сна', 'Sleep Monitoring')} subtitle={tr('Продолжительность и регулярность сна относительно личной истории', 'Sleep duration and regularity vs. personal history')} right={sleep[0].is_simulated ? <SimBadge /> : undefined} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={tr('Последняя ночь', 'Last night')} value={hm(sleep[sleep.length - 1].duration_minutes)} />
        <Stat label={tr('Среднее за 7 ночей', '7-night average')} value={hm(last7.reduce((s, x) => s + x.duration_minutes, 0) / last7.length)} />
        <Stat label={tr('Личная baseline', 'Personal baseline')} value={hm(baseline)} hint={tr(`медиана первых ${CONFIG.sleepBaselineNights} ночей`, `median of first ${CONFIG.sleepBaselineNights} nights`)} />
        <Stat label={tr('Регулярность засыпания', 'Bedtime regularity')} value={`±${Math.round(regNow)}`} unit={tr('мин', 'min')} hint={`baseline ±${Math.round(regBase)} ${tr('мин', 'min')}`} />
      </div>
      <Card title={tr('Продолжительность сна по ночам (линия — личная baseline)', 'Sleep duration per night (line — personal baseline)')}>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#1c2944" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" stroke="#6d7891" fontSize={11} />
              <YAxis stroke="#6d7891" fontSize={11} unit={tr('ч', 'h')} domain={[0, 10]} />
              <Tooltip contentStyle={{ background: '#080d19', border: '1px solid #2b3c62', borderRadius: 3, fontSize: 12 }} formatter={(v) => [`${v} ${tr('ч', 'h')}`, tr('Сон', 'Sleep')]} cursor={{ fill: '#1c294455' }} />
              <ReferenceLine y={Number((baseline / 60).toFixed(2))} stroke="#b9c4da" strokeDasharray="5 4" />
              <Bar dataKey="h" fill="#4d8dff" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <p className="text-xs text-ink-mute">
        {tr(
          'Сон в космосе связан с изоляцией, расписанием и освещением — это фактор поведенческого здоровья в задании NASA. Приложение показывает только изменения относительно вашей собственной истории.',
          'Sleep in space is shaped by isolation, schedules and lighting — a behavioral-health factor in the NASA challenge. The app only shows changes relative to your own history.',
        )}
      </p>
    </div>
  )
}
