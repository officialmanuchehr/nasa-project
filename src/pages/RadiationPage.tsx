// Radiation Tracking: суточная и накопленная доза. Отсутствующие измерения не подменяются.
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '../features/health/DataProvider'
import { Card, Empty, PageHeader, SimBadge, Stat } from '../components/ui'
import { dailyDose } from '../features/health/selectors'
import { tr } from '../lib/i18n'

export default function RadiationPage() {
  const { radiation } = useData()
  const days = dailyDose(radiation)
  if (!days.length)
    return (
      <div>
        <PageHeader title={tr('Радиация', 'Radiation Tracking')} />
        <Empty>{tr('Нет измерений дозиметра. Значения не подставляются, пока нет достоверного источника и единиц.', 'No dosimeter readings. No values are substituted until there is a reliable source with units.')}</Empty>
      </div>
    )
  const last = radiation[radiation.length - 1]
  const total = days[days.length - 1].cumulative
  const rows = days.map((d) => ({ ...d, label: d.day.slice(5).split('-').reverse().join('.') }))
  return (
    <div className="space-y-5">
      <PageHeader title={tr('Радиация', 'Radiation Tracking')} subtitle={tr('Экспозиция по данным дозиметра', 'Exposure from dosimeter data')} right={last.is_simulated ? <SimBadge /> : undefined} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={tr('Накопленная доза', 'Cumulative dose')} value={total.toFixed(2)} unit={tr('мЗв', 'mSv')} color="#ffc233" />
        <Stat label={tr('За последние сутки', 'Last 24 h')} value={days[days.length - 1].dose.toFixed(2)} unit={tr('мЗв', 'mSv')} />
        <Stat label={tr('Средняя в сутки', 'Daily average')} value={(total / days.length).toFixed(2)} unit={tr('мЗв', 'mSv')} />
        <Stat label={tr('Источник', 'Source')} value={String(radiation.length)} unit={tr('изм.', 'readings')} hint={last.instrument_source} />
      </div>
      <Card title={tr('Суточная доза (столбцы) и накопленная доза (линия)', 'Daily dose (bars) and cumulative dose (line)')}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 6, right: 0, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#1c2944" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke="#6d7891" fontSize={11} />
              <YAxis yAxisId="d" stroke="#6d7891" fontSize={11} />
              <YAxis yAxisId="c" orientation="right" stroke="#6d7891" fontSize={11} />
              <Tooltip contentStyle={{ background: '#080d19', border: '1px solid #2b3c62', borderRadius: 3, fontSize: 12 }} formatter={(v, n) => [`${v} ${tr('мЗв', 'mSv')}`, n === 'dose' ? tr('За сутки', 'Daily') : tr('Накоплено', 'Cumulative')]} cursor={{ fill: '#1c294455' }} />
              <Bar yAxisId="d" dataKey="dose" fill="#ffc233" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Line yAxisId="c" dataKey="cumulative" stroke="#b9c4da" dot={false} strokeWidth={2} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <p className="text-xs text-ink-mute">
        {tr(
          'Космическое излучение — один из факторов риска, названных в задании NASA. Значения на этой странице сгенерированы симулятором дозиметра и не являются реальными дозами экипажа. Приложение сравнивает дозу только с историей этой же миссии и не применяет медицинских лимитов.',
          'Space radiation is one of the hazards named in the NASA challenge. Values on this page come from a dosimeter simulator and are not real crew doses. The app compares the dose only with this mission’s own history and applies no medical limits.',
        )}
      </p>
    </div>
  )
}
