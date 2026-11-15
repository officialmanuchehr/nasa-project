// Radiation Tracking: суточная и накопленная доза. Отсутствующие измерения не подменяются.
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '../features/health/DataProvider'
import { Card, Empty, PageHeader, SimBadge, Stat } from '../components/ui'
import { dailyDose } from '../features/health/selectors'

export default function RadiationPage() {
  const { radiation } = useData()
  const days = dailyDose(radiation)
  if (!days.length)
    return (
      <div>
        <PageHeader title="Radiation Tracking" />
        <Empty>Нет измерений дозиметра. Значения не подставляются, пока нет достоверного источника и единиц.</Empty>
      </div>
    )
  const last = radiation[radiation.length - 1]
  const total = days[days.length - 1].cumulative
  const rows = days.map((d) => ({ ...d, label: d.day.slice(5).split('-').reverse().join('.') }))
  return (
    <div className="space-y-5">
      <PageHeader title="Radiation Tracking" subtitle="Экспозиция по данным дозиметра" right={last.is_simulated ? <SimBadge /> : undefined} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Накопленная доза" value={total.toFixed(2)} unit="мЗв" color="#ffc233" />
        <Stat label="За последние сутки" value={days[days.length - 1].dose.toFixed(2)} unit="мЗв" />
        <Stat label="Средняя в сутки" value={(total / days.length).toFixed(2)} unit="мЗв" />
        <Stat label="Источник" value={String(radiation.length)} unit="изм." hint={last.instrument_source} />
      </div>
      <Card title="Суточная доза (столбцы) и накопленная доза (линия)">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 6, right: 0, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#1c2944" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="#6d7891" fontSize={11} />
              <YAxis yAxisId="d" stroke="#6d7891" fontSize={11} />
              <YAxis yAxisId="c" orientation="right" stroke="#6d7891" fontSize={11} />
              <Tooltip contentStyle={{ background: '#080d19', border: '1px solid #2b3c62', borderRadius: 10, fontSize: 12 }} formatter={(v, n) => [`${v} мЗв`, n === 'dose' ? 'За сутки' : 'Накоплено']} cursor={{ fill: '#1c294455' }} />
              <Bar yAxisId="d" dataKey="dose" fill="#ffc233" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Line yAxisId="c" dataKey="cumulative" stroke="#b9c4da" dot={false} strokeWidth={2} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <p className="text-xs text-ink-mute">
        Космическое излучение — один из факторов риска, названных в задании NASA. Значения на этой странице сгенерированы симулятором
        дозиметра и не являются реальными дозами экипажа. Приложение сравнивает дозу только с историей этой же миссии и не применяет
        медицинских лимитов.
      </p>
    </div>
  )
}
