// Risk Detection: оценка по категориям, история предупреждений и прозрачное описание правил.
import { useData } from '../features/health/DataProvider'
import { Card, Empty, PageHeader, SeverityBadge } from '../components/ui'
import { AlertCard } from '../components/alerts/AlertCard'
import { CATEGORY_LABELS } from '../features/health/metrics'
import { CONFIG, RULESET_VERSION } from '../features/risk-detection/engine'

const RULES = [
  ['DQ-1', 'Устаревший датчик', `Нет валидных измерений дольше ${CONFIG.staleHours} ч → медицинские правила по показателю приостанавливаются.`],
  ['DQ-2', 'Пропуски данных', `Более ${CONFIG.maxBadFraction * 100}% измерений за 24 ч отсутствуют/сомнительны → они исключаются из анализа.`],
  ['BL-1', 'Смещение от личной baseline', `Baseline = медиана по часу суток за первые ${CONFIG.baselineDays} сут. Оба последних окна по ${CONFIG.windowHours} ч смещены в одну сторону: ≥${CONFIG.shiftZ.LOW}σ LOW, ≥${CONFIG.shiftZ.MEDIUM}σ MEDIUM, ≥${CONFIG.shiftZ.HIGH}σ HIGH.`],
  ['SL-1', 'Сокращение сна', `Каждая из последних ${CONFIG.sleepRecentNights} ночей короче личной медианы первых ${CONFIG.sleepBaselineNights} ночей на ≥${CONFIG.sleepDrop.LOW * 100}% (LOW) / ≥${CONFIG.sleepDrop.MEDIUM * 100}% (MEDIUM).`],
  ['RD-1', 'Изменение дозы радиации', `Доза за 24 ч ≥×${CONFIG.radiationRatio.LOW} (LOW) / ≥×${CONFIG.radiationRatio.MEDIUM} (MEDIUM) медианы суточной дозы миссии. Только при известных единицах (мЗв).`],
  ['SR-1', 'Самоотчёт', `Самооценка симптома ≥${CONFIG.symptomIntensity}/10 за 24 ч → LOW. Это самоотчёт, а не диагноз.`],
]

export default function RiskDetectionPage() {
  const { engine, alerts, acknowledge } = useData()
  return (
    <div className="space-y-5">
      <PageHeader title="Risk Detection" subtitle={`Прозрачный rule-based движок · версия правил ${RULESET_VERSION}`} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {engine?.assessments.map((a) => (
          <div key={a.category} className={`panel p-4 ${a.status === 'attention' ? 'border-medium/50' : ''}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="label-caps">{CATEGORY_LABELS[a.category]}</span>
              {a.severity ? <SeverityBadge severity={a.severity} /> : <span className={`text-xs ${a.status === 'ok' ? 'text-ok' : 'text-ink-mute'}`}>{a.status === 'ok' ? 'OK' : 'Нет данных'}</span>}
            </div>
            <p className="mt-2 text-xs text-ink-dim">{a.explanation}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card title="История предупреждений" className="lg:col-span-3">
          {alerts.length ? (
            <div className="space-y-2.5">
              {alerts.map((a) => (
                <AlertCard key={a.id} alert={a} onAck={acknowledge} compact />
              ))}
            </div>
          ) : (
            <Empty>Предупреждений нет.</Empty>
          )}
        </Card>
        <Card title="Правила (демо-параметры)" className="lg:col-span-2">
          <ul className="space-y-3">
            {RULES.map(([id, name, text]) => (
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
            Параметры чувствительности — демонстрационные, а не медицинские пороги и не стандарты NASA. Уровень CRITICAL автоматически не
            присваивается: его значение и действия определяют специалисты и протоколы миссии. Повторные предупреждения по одному
            продолжающемуся событию не создаются; когда условие исчезает, предупреждение закрывается автоматически.
          </p>
        </Card>
      </div>
    </div>
  )
}
