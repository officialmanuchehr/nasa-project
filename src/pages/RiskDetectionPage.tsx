// Risk Detection: оценка по категориям, история предупреждений и прозрачное описание правил.
import { useData } from '../features/health/DataProvider'
import { Card, Empty, PageHeader, SeverityBadge } from '../components/ui'
import { AlertCard } from '../components/alerts/AlertCard'
import { CATEGORY_LABELS } from '../features/health/metrics'
import { CONFIG, RULESET_VERSION } from '../features/risk-detection/engine'
import { tr } from '../lib/i18n'

const RULES = () => [
  ['DQ-1', tr('Устаревший датчик', 'Stale sensor'), tr(`Нет валидных измерений дольше ${CONFIG.staleHours} ч → медицинские правила по показателю приостанавливаются.`, `No valid readings for more than ${CONFIG.staleHours} h → medical rules for the metric are paused.`)],
  ['DQ-2', tr('Пропуски данных', 'Missing data'), tr(`Более ${CONFIG.maxBadFraction * 100}% измерений за 24 ч отсутствуют/сомнительны → они исключаются из анализа.`, `More than ${CONFIG.maxBadFraction * 100}% of readings in 24 h are missing/questionable → they are excluded from analysis.`)],
  ['BL-1', tr('Смещение от личной baseline', 'Shift from personal baseline'), tr(`Baseline = медиана по часу суток за первые ${CONFIG.baselineDays} сут. Оба последних окна по ${CONFIG.windowHours} ч смещены в одну сторону: ≥${CONFIG.shiftZ.LOW}σ LOW, ≥${CONFIG.shiftZ.MEDIUM}σ MEDIUM, ≥${CONFIG.shiftZ.HIGH}σ HIGH.`, `Baseline = hour-of-day median over the first ${CONFIG.baselineDays} days. Both latest ${CONFIG.windowHours} h windows shifted in the same direction: ≥${CONFIG.shiftZ.LOW}σ LOW, ≥${CONFIG.shiftZ.MEDIUM}σ MEDIUM, ≥${CONFIG.shiftZ.HIGH}σ HIGH.`)],
  ['SL-1', tr('Сокращение сна', 'Sleep reduction'), tr(`Каждая из последних ${CONFIG.sleepRecentNights} ночей короче личной медианы первых ${CONFIG.sleepBaselineNights} ночей на ≥${CONFIG.sleepDrop.LOW * 100}% (LOW) / ≥${CONFIG.sleepDrop.MEDIUM * 100}% (MEDIUM).`, `Each of the last ${CONFIG.sleepRecentNights} nights is shorter than the personal median of the first ${CONFIG.sleepBaselineNights} nights by ≥${CONFIG.sleepDrop.LOW * 100}% (LOW) / ≥${CONFIG.sleepDrop.MEDIUM * 100}% (MEDIUM).`)],
  ['RD-1', tr('Изменение дозы радиации', 'Radiation dose change'), tr(`Доза за 24 ч ≥×${CONFIG.radiationRatio.LOW} (LOW) / ≥×${CONFIG.radiationRatio.MEDIUM} (MEDIUM) медианы суточной дозы миссии. Только при известных единицах (мЗв).`, `24 h dose ≥×${CONFIG.radiationRatio.LOW} (LOW) / ≥×${CONFIG.radiationRatio.MEDIUM} (MEDIUM) of the mission's median daily dose. Only with known units (mSv).`)],
  ['SR-1', tr('Самоотчёт', 'Self-report'), tr(`Самооценка симптома ≥${CONFIG.symptomIntensity}/10 за 24 ч → LOW. Это самоотчёт, а не диагноз.`, `Symptom self-rating ≥${CONFIG.symptomIntensity}/10 within 24 h → LOW. This is a self-report, not a diagnosis.`)],
]

export default function RiskDetectionPage() {
  const { engine, alerts, acknowledge } = useData()
  return (
    <div className="space-y-5">
      <PageHeader title={tr('Обнаружение рисков', 'Risk Detection')} subtitle={tr(`Прозрачный rule-based движок · версия правил ${RULESET_VERSION}`, `Transparent rule-based engine · ruleset ${RULESET_VERSION}`)} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {engine?.assessments.map((a) => (
          <div key={a.category} className={`panel p-4 ${a.status === 'attention' ? 'border-medium/50' : ''}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="label-caps">{CATEGORY_LABELS[a.category]}</span>
              {a.severity ? <SeverityBadge severity={a.severity} /> : <span className={`text-xs ${a.status === 'ok' ? 'text-ok' : 'text-ink-mute'}`}>{a.status === 'ok' ? 'OK' : tr('Нет данных', 'No data')}</span>}
            </div>
            <p className="mt-2 text-xs text-ink-dim">{a.explanation}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card title={tr('История предупреждений', 'Alert history')} className="lg:col-span-3">
          {alerts.length ? (
            <div className="space-y-2.5">
              {alerts.map((a) => (
                <AlertCard key={a.id} alert={a} onAck={acknowledge} compact />
              ))}
            </div>
          ) : (
            <Empty>{tr('Предупреждений нет.', 'No alerts.')}</Empty>
          )}
        </Card>
        <Card title={tr('Правила (демо-параметры)', 'Rules (demo parameters)')} className="lg:col-span-2">
          <ul className="space-y-3">
            {RULES().map(([id, name, text]) => (
              <li key={id}>
                <div className="text-sm font-medium">
                  <span className="mr-2 font-mono text-accent">{id}</span>
                  {name}
                </div>
                <p className="text-xs text-ink-mute">{text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-lg border border-medium/30 bg-medium/5 p-2.5 text-xs text-ink-dim">
            {tr(
              'Параметры чувствительности — демонстрационные, а не медицинские пороги и не стандарты NASA. Уровень CRITICAL автоматически не присваивается: его значение и действия определяют специалисты и протоколы миссии. Повторные предупреждения по одному продолжающемуся событию не создаются; когда условие исчезает, предупреждение закрывается автоматически.',
              'Sensitivity parameters are for demonstration — not medical thresholds and not NASA standards. CRITICAL is never assigned automatically: its meaning and actions are defined by specialists and mission protocols. No duplicate alerts are created for one ongoing event; when the condition clears, the alert resolves automatically.',
            )}
          </p>
        </Card>
      </div>
    </div>
  )
}
