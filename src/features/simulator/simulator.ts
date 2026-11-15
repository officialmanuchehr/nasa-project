// Симулятор демонстрационных данных StarTime+.
// Каждая запись: is_simulated = true, data_source = 'simulator'.
// Значения похожи по структуре на реальные временные ряды (суточный ритм, шум,
// тренировки), но НЕ являются реальными данными астронавтов или NASA и
// не используются для медицинских выводов.
import type { HealthMetric, MetricType, RadiationRecord, SleepRecord } from '../../types'
import { METRICS } from '../health/metrics'
import { tr } from '../../lib/i18n'

export type Scenario = 'normal' | 'gaps' | 'stale_sensor' | 'trend_change'

export const SCENARIOS: Record<Scenario, { label: string; description: string }> = {
  normal: {
    get label() { return tr('Обычная динамика', 'Normal dynamics') },
    get description() { return tr('Стабильные показатели с суточным ритмом и шумом.', 'Stable vitals with a circadian rhythm and noise.') },
  },
  gaps: {
    get label() { return tr('Пропуски измерений', 'Missing measurements') },
    get description() { return tr('Часть измерений отсутствует (NULL) или помечена как сомнительная.', 'Some measurements are missing (NULL) or flagged as questionable.') },
  },
  stale_sensor: {
    get label() { return tr('Устаревший датчик', 'Stale sensor') },
    get description() { return tr('Датчик SpO₂ перестал присылать данные последние 10 часов.', 'The SpO₂ sensor has sent no data for the last 10 hours.') },
  },
  trend_change: {
    get label() { return tr('Изменение тенденции', 'Trend change') },
    get description() { return tr('Последние 3 суток пульс и температура растут, сон сокращается, всплеск радиации.', 'Over the last 3 days heart rate and temperature rise, sleep shortens, radiation spikes.') },
  },
}

const HOUR = 3600_000
const DAY = 24 * HOUR

// Детерминированный генератор случайных чисел (mulberry32) — одинаковый seed = одинаковые данные.
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
// Нормальный шум (Box–Muller)
function gauss(r: () => number) {
  const u = Math.max(r(), 1e-9)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r())
}

export interface SimContext {
  astronautId: string
  missionId: string
  scenario: Scenario
  seed: number
  end: Date // конец истории (обычно «сейчас»)
}

// Насколько «включено» изменение тенденции в момент t (0 → 1 за последние 72 часа).
function trendFactor(ctx: SimContext, t: number) {
  if (ctx.scenario !== 'trend_change') return 0
  const start = ctx.end.getTime() - 72 * HOUR
  return Math.min(1, Math.max(0, (t - start) / (72 * HOUR)))
}

// Значение показателя в момент t без шума пропусков.
function vitalAt(type: MetricType, t: number, ctx: SimContext, r: () => number): number {
  const hour = new Date(t).getUTCHours()
  const circ = Math.sin(((hour - 9) / 24) * 2 * Math.PI) // суточный ритм: пик днём
  const sleeping = hour >= 22 || hour < 6
  const exercising = hour === 8 || hour === 16 // две тренировки в сутки (как на МКС)
  const tf = trendFactor(ctx, t)
  switch (type) {
    case 'heart_rate':
      return 66 + 6 * circ + (exercising ? 38 : 0) + (sleeping ? -8 : 0) + 14 * tf + 2.5 * gauss(r)
    case 'spo2':
      return Math.min(100, 97.4 + 0.6 * gauss(r) - 0.8 * tf)
    case 'body_temp':
      return 36.65 + 0.3 * circ + (exercising ? 0.3 : 0) + 0.55 * tf + 0.08 * gauss(r)
    case 'systolic_bp':
      return 117 + 5 * circ + (exercising ? 18 : 0) + 6 * tf + 3 * gauss(r)
    case 'diastolic_bp':
      return 75 + 3 * circ + (exercising ? 6 : 0) + 3 * tf + 2 * gauss(r)
    case 'activity':
      return sleeping ? 0 : Math.max(0, Math.min(60, (exercising ? 50 : 8) + 5 * gauss(r)))
  }
}

function round(type: MetricType, v: number) {
  const d = METRICS[type].decimals
  return Number(v.toFixed(d))
}

// Одно измерение показателя (с учётом сценария пропусков / устаревшего датчика).
function makeMetric(type: MetricType, t: number, ctx: SimContext, r: () => number): HealthMetric | null {
  // Устаревший датчик: SpO₂ молчит последние 10 часов (записей нет вовсе).
  if (ctx.scenario === 'stale_sensor' && type === 'spo2' && t > ctx.end.getTime() - 10 * HOUR) return null

  let value: number | null = round(type, vitalAt(type, t, ctx, r))
  let quality: HealthMetric['quality_status'] = 'ok'

  if (ctx.scenario === 'gaps') {
    const p = r()
    if (p < 0.12) {
      value = null // измерения нет — NULL, а не выдуманное число
      quality = 'missing'
    } else if (p < 0.15) {
      value = round(type, METRICS[type].validRange[1] * 1.2) // артефакт датчика
      quality = 'suspect'
    }
  }

  return {
    id: crypto.randomUUID(),
    astronaut_id: ctx.astronautId,
    mission_id: ctx.missionId,
    metric_type: type,
    value,
    unit: METRICS[type].unit,
    recorded_at: new Date(t).toISOString(),
    data_source: 'simulator',
    is_simulated: true,
    quality_status: quality,
  }
}

const VITALS: MetricType[] = ['heart_rate', 'spo2', 'body_temp', 'systolic_bp', 'diastolic_bp', 'activity']

export interface SimHistory {
  metrics: HealthMetric[]
  sleep: SleepRecord[]
  radiation: RadiationRecord[]
}

/** Сгенерировать историю за `days` суток с шагом 1 час. */
export function generateHistory(ctx: SimContext, days = 21): SimHistory {
  const r = rng(ctx.seed)
  const end = Math.floor(ctx.end.getTime() / HOUR) * HOUR
  const start = end - days * DAY
  const metrics: HealthMetric[] = []
  const sleep: SleepRecord[] = []
  const radiation: RadiationRecord[] = []

  for (let t = start; t <= end; t += HOUR) {
    for (const type of VITALS) {
      const m = makeMetric(type, t, ctx, r)
      if (m) metrics.push(m)
    }
    // Радиация: измерение каждые 6 часов (доза за 6 ч, мЗв)
    if (new Date(t).getUTCHours() % 6 === 0) {
      const spike = ctx.scenario === 'trend_change' && t > end - 22 * HOUR && t <= end - 4 * HOUR
      radiation.push({
        id: crypto.randomUUID(),
        astronaut_id: ctx.astronautId,
        mission_id: ctx.missionId,
        measured_value: Number(Math.max(0.01, 0.12 + 0.015 * gauss(r) + (spike ? 0.45 : 0)).toFixed(3)),
        unit: 'mSv',
        recorded_at: new Date(t).toISOString(),
        instrument_source: 'Dosimeter simulator',
        is_simulated: true,
      })
    }
  }

  // Сон: одна запись на каждую ночь (засыпание ~22:00 UTC)
  for (let d = 0; d < days; d++) {
    const dayStart = Math.floor((start + d * DAY) / DAY) * DAY
    const lastNights = days - d <= 4
    const shorten = ctx.scenario === 'trend_change' && lastNights ? 115 : 0
    const startOffset = (22 * 60 + 25 * gauss(r)) * 60_000
    const duration = Math.round(450 - shorten + 18 * gauss(r))
    const s = dayStart + startOffset
    const e = s + duration * 60_000
    if (e > end) break
    sleep.push({
      id: crypto.randomUUID(),
      astronaut_id: ctx.astronautId,
      mission_id: ctx.missionId,
      sleep_start: new Date(s).toISOString(),
      sleep_end: new Date(e).toISOString(),
      duration_minutes: duration,
      quality_data: { awakenings: Math.max(0, Math.round(1.5 + gauss(r) + (shorten ? 2 : 0))) },
      data_source: 'simulator',
      is_simulated: true,
    })
  }

  return { metrics, sleep, radiation }
}

/** Одна «живая» точка для каждого показателя в момент `at` (режим Live). */
export function generateLivePoint(ctx: SimContext, at: Date): HealthMetric[] {
  const r = rng(Math.floor(at.getTime() / 1000) ^ ctx.seed)
  return VITALS.map((type) => makeMetric(type, at.getTime(), { ...ctx, end: at }, r)).filter(
    (m): m is HealthMetric => m !== null,
  )
}
