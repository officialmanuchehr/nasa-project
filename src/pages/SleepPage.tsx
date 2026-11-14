// Sleep Monitoring: продолжительность и регулярность сна относительно личной истории.
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '../features/health/DataProvider'
import { Card, Empty, PageHeader, SimBadge, Stat } from '../components/ui'
import { CONFIG, median } from '../features/risk-detection/engine'

function sd(xs: number[]) {
  const m = xs.reduce((s, x) => s + x, 0) / xs.length
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length)
}
const hm = (min: number) => `${Math.floor(min / 60)}ч ${Math.round(min % 60)}м`

export default function SleepPage() {
  const { sleep } = useData()
  if (!sleep.length)
    return (
      <div>
        <PageHeader title="Sleep Monitoring" />
        <Empty>Нет данных о сне.</Empty>
      </div>
    )
  const baseline = median(sleep.slice(0, CONFIG.sleepBaselineNights).map((s) => s.duration_minutes))
  const rows = sleep.map((s) => ({ day: new Date(s.sleep_start).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }), h: Number((s.duration_minutes / 60).toFixed(2)), aw: s.quality_data?.awakenings ?? null }))
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
      <PageHeader title="Sleep Monitoring" subtitle="Продолжительность и регулярность сна относительно личной истории" right={sleep[0].is_simulated ? <SimBadge /> : undefined} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Последняя ночь" value={hm(sleep[sleep.length - 1].duration_minutes)} />
        <Stat label="Среднее за 7 ночей" value={hm(last7.reduce((s, x) => s + x.duration_minutes, 0) / last7.length)} />
        <Stat label="Личная baseline" value={hm(baseline)} hint={`медиана первых ${CONFIG.sleepBaselineNights} ночей`} />
        <Stat label="Регулярность засыпания" value={`±${Math.round(regNow)}`} unit="мин" hint={`baseline ±${Math.round(regBase)} мин`} />
      </div>
      <Card title="Продолжительность сна по ночам (линия — личная baseline)">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#1e2a55" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" stroke="#6b77a3" fontSize={11} />
              <YAxis stroke="#6b77a3" fontSize={11} unit="ч" domain={[0, 10]} />
              <Tooltip contentStyle={{ background: '#0a1024', border: '1px solid #2c3b72', borderRadius: 10, fontSize: 12 }} formatter={(v) => [`${v} ч`, 'Сон']} cursor={{ fill: '#1e2a5555' }} />
              <ReferenceLine y={Number((baseline / 60).toFixed(2))} stroke="#a78bfa" strokeDasharray="5 4" />
              <Bar dataKey="h" fill="#38bdf8" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <p className="text-xs text-ink-mute">
        Сон в космосе связан с изоляцией, расписанием и освещением — это фактор поведенческого здоровья в задании NASA. Приложение показывает
        только изменения относительно вашей собственной истории.
      </p>
    </div>
  )
}
