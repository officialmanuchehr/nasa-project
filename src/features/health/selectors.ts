// Вспомогательные выборки из данных (последние значения, статистика за период).
import type { HealthMetric, MetricType, RadiationRecord } from '../../types'
import { isValid, median } from '../risk-detection/engine'
import { tr } from '../../lib/i18n'

export function byType(metrics: HealthMetric[], type: MetricType) {
  return metrics.filter((m) => m.metric_type === type)
}

export function latestValid(metrics: HealthMetric[], type: MetricType) {
  let best: HealthMetric | null = null
  for (const m of metrics) if (m.metric_type === type && isValid(m) && (!best || m.recorded_at > best.recorded_at)) best = m
  return best
}

export function ageLabel(iso?: string) {
  if (!iso) return tr('нет данных', 'no data')
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return tr('только что', 'just now')
  if (min < 60) return tr(`${min} мин назад`, `${min} min ago`)
  const h = Math.round(min / 60)
  return h < 48 ? tr(`${h} ч назад`, `${h} h ago`) : tr(`${Math.round(h / 24)} дн назад`, `${Math.round(h / 24)} d ago`)
}

export function periodStats(metrics: HealthMetric[], type: MetricType, from: number) {
  const all = metrics.filter((m) => m.metric_type === type && new Date(m.recorded_at).getTime() >= from)
  const valid = all.filter(isValid).map((m) => m.value as number)
  return {
    n: all.length,
    valid: valid.length,
    missingPct: all.length ? Math.round(((all.length - valid.length) / all.length) * 100) : 0,
    min: valid.length ? Math.min(...valid) : null,
    max: valid.length ? Math.max(...valid) : null,
    median: valid.length ? median(valid) : null,
  }
}

/** Доза по суткам (UTC) + накопленная доза. */
export function dailyDose(records: RadiationRecord[]) {
  const map = new Map<string, number>()
  for (const r of records) {
    const d = r.recorded_at.slice(0, 10)
    map.set(d, (map.get(d) ?? 0) + r.measured_value)
  }
  let cum = 0
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, dose]) => {
      cum += dose
      return { day, dose: Number(dose.toFixed(3)), cumulative: Number(cum.toFixed(3)) }
    })
}
