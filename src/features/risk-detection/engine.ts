// Risk Detection Engine — прозрачный rule-based модуль (без «чёрного ящика» ML).
//
// Принципы:
//  • Сравнение с ИНДИВИДУАЛЬНОЙ baseline астронавта (первые дни миссии), а не с
//    «нормами». Медицинских порогов здесь нет — параметры ниже являются
//    ДЕМО-параметрами чувствительности и должны быть согласованы со специалистами.
//  • Сначала качество данных: по устаревшим/неполным данным медицинское
//    предупреждение не создаётся — создаётся предупреждение о качестве данных.
//  • Каждое предупреждение: категория, уровень, причина, доказательства, период,
//    качество данных, правило + версия, рекомендуемый следующий шаг.
//  • CRITICAL автоматически не присваивается — только специалистом / протоколом.
import type {
  Evidence,
  HealthAlert,
  HealthMetric,
  MetricType,
  RadiationRecord,
  RiskCategory,
  Severity,
  SleepRecord,
  SymptomLog,
} from '../../types'
import { METRICS } from '../health/metrics'

export const RULESET_VERSION = 'demo-2026.11-r1'

// ДЕМО-параметры (не медицинские пороги).
export const CONFIG = {
  baselineDays: 7, // сколько первых суток истории формируют baseline
  minBaselineReadings: 48, // минимум валидных измерений для baseline
  windowHours: 12, // длина окна анализа
  minWindowReadings: 6, // минимум валидных измерений в окне
  shiftZ: { LOW: 2, MEDIUM: 3, HIGH: 5 } as Record<Exclude<Severity, 'CRITICAL'>, number>, // устойчивое смещение (в робастных σ)
  staleHours: 3, // данные старше — «устаревший датчик»
  maxBadFraction: 0.2, // доля пропусков/сомнительных за 24 ч
  sleepBaselineNights: 7,
  sleepRecentNights: 3,
  sleepDrop: { LOW: 0.15, MEDIUM: 0.2 }, // относительное сокращение сна
  radiationRatio: { LOW: 2, MEDIUM: 3 }, // доза за 24 ч / медиана суточной дозы миссии
  symptomIntensity: 7, // самооценка 0..10
}

const HOUR = 3600_000
const SHIFT_METRICS: MetricType[] = ['heart_rate', 'spo2', 'body_temp', 'systolic_bp', 'diastolic_bp']

export type AlertDraft = Omit<HealthAlert, 'id' | 'status' | 'created_at' | 'resolved_at'>

export interface CategoryAssessment {
  category: RiskCategory
  status: 'ok' | 'attention' | 'insufficient_data'
  severity: Severity | null
  explanation: string
}

export interface EngineInput {
  astronautId: string
  missionId: string
  metrics: HealthMetric[]
  sleep: SleepRecord[]
  radiation: RadiationRecord[]
  symptoms: SymptomLog[]
  now: Date
}

export interface EngineOutput {
  drafts: AlertDraft[]
  assessments: CategoryAssessment[]
  baselines: Partial<Record<MetricType, MetricBaseline>>
}

export interface MetricBaseline {
  hourly: number[] // медиана по каждому часу суток (UTC), учитывает суточный ритм
  spread: number // робастная σ остатков (1.4826 × MAD)
  n: number
}

// ───────────────────────── helpers ─────────────────────────
export function median(xs: number[]): number {
  if (!xs.length) return NaN
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** Валидное ли измерение для медицинского анализа. */
export function isValid(m: HealthMetric): boolean {
  if (m.value === null || m.quality_status !== 'ok') return false
  const [lo, hi] = METRICS[m.metric_type].validRange
  return m.value >= lo && m.value <= hi
}

const t = (iso: string) => new Date(iso).getTime()
const hourOf = (iso: string) => new Date(iso).getUTCHours()
const sevRank: Record<Severity, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }

/** Индивидуальная baseline: медиана по часу суток + робастный разброс остатков. */
export function computeBaseline(readings: HealthMetric[]): MetricBaseline | null {
  const valid = readings.filter(isValid)
  if (valid.length < CONFIG.minBaselineReadings) return null
  const first = Math.min(...valid.map((m) => t(m.recorded_at)))
  const base = valid.filter((m) => t(m.recorded_at) < first + CONFIG.baselineDays * 24 * HOUR)
  if (base.length < CONFIG.minBaselineReadings) return null

  const byHour: number[][] = Array.from({ length: 24 }, () => [])
  base.forEach((m) => byHour[hourOf(m.recorded_at)].push(m.value as number))
  const overall = median(base.map((m) => m.value as number))
  const hourly = byHour.map((xs) => (xs.length ? median(xs) : overall))
  const residuals = base.map((m) => (m.value as number) - hourly[hourOf(m.recorded_at)])
  const resMed = median(residuals)
  const mad = median(residuals.map((r) => Math.abs(r - resMed)))
  // нижняя граница разброса: не меньше разрешения датчика (1 ед. последнего знака),
  // иначе целочисленные показатели (SpO₂) дают ложные «смещения»
  const resolution = 10 ** -METRICS[valid[0].metric_type].decimals
  const spread = Math.max(1.4826 * mad, resolution, Math.abs(overall) * 0.002)
  return { hourly, spread, n: base.length }
}

function windowResidualZ(readings: HealthMetric[], b: MetricBaseline, from: number, to: number) {
  const w = readings.filter((m) => isValid(m) && t(m.recorded_at) > from && t(m.recorded_at) <= to)
  if (w.length < CONFIG.minWindowReadings) return { z: null as number | null, n: w.length, current: NaN, expected: NaN }
  const residual = median(w.map((m) => (m.value as number) - b.hourly[hourOf(m.recorded_at)]))
  return {
    z: residual / b.spread,
    n: w.length,
    current: median(w.map((m) => m.value as number)),
    expected: median(w.map((m) => b.hourly[hourOf(m.recorded_at)])),
  }
}

function shiftSeverity(absZ: number): Severity | null {
  if (absZ >= CONFIG.shiftZ.HIGH) return 'HIGH'
  if (absZ >= CONFIG.shiftZ.MEDIUM) return 'MEDIUM'
  if (absZ >= CONFIG.shiftZ.LOW) return 'LOW'
  return null
}

// ───────────────────────── engine ─────────────────────────
export function evaluate(input: EngineInput): EngineOutput {
  const now = input.now.getTime()
  const drafts: AlertDraft[] = []
  const baselines: EngineOutput['baselines'] = {}
  const catState = new Map<RiskCategory, CategoryAssessment>()
  const base = { astronaut_id: input.astronautId, mission_id: input.missionId, ruleset_version: RULESET_VERSION }

  const note = (category: RiskCategory, status: CategoryAssessment['status'], severity: Severity | null, explanation: string) => {
    const prev = catState.get(category)
    const rank = (a?: CategoryAssessment) =>
      !a ? -1 : a.status === 'attention' ? 10 + sevRank[a.severity as Severity] : a.status === 'insufficient_data' ? 1 : 0
    const next = { category, status, severity, explanation }
    if (!prev || rank(next) > rank(prev)) catState.set(category, next)
  }

  const byMetric = new Map<MetricType, HealthMetric[]>()
  input.metrics.forEach((m) => {
    if (!byMetric.has(m.metric_type)) byMetric.set(m.metric_type, [])
    byMetric.get(m.metric_type)!.push(m)
  })

  // Правило DQ-1: устаревший датчик. Правило DQ-2: много пропусков.
  for (const type of SHIFT_METRICS) {
    const all = byMetric.get(type) ?? []
    const info = METRICS[type]
    const valid = all.filter(isValid)
    const last = valid.length ? Math.max(...valid.map((m) => t(m.recorded_at))) : null
    if (all.length && (last === null || now - last > CONFIG.staleHours * HOUR)) {
      const hours = last === null ? null : Math.round((now - last) / HOUR)
      drafts.push({
        ...base,
        category: 'data_quality',
        severity: 'LOW',
        title: `Нет свежих данных: ${info.label}`,
        description: `Последнее валидное измерение «${info.label}» было ${hours === null ? 'давно' : `${hours} ч назад`} (допуск: ${CONFIG.staleHours} ч). Медицинские правила для этого показателя приостановлены.`,
        next_step: 'Проверить крепление и питание датчика, синхронизацию устройства.',
        data_quality: 'Данные устарели',
        rule_id: 'DQ-1 stale_sensor',
        dedup_key: `DQ-1:${type}`,
        evidence_json: { metric: type, note: last ? `Последнее измерение: ${new Date(last).toISOString()}` : 'Нет валидных измерений' },
        period_start: new Date(last ?? now).toISOString(),
        period_end: input.now.toISOString(),
      })
      note('data_quality', 'attention', 'LOW', `Датчик «${info.label}» не присылает данные.`)
    }
    const day = all.filter((m) => t(m.recorded_at) > now - 24 * HOUR)
    const bad = day.filter((m) => !isValid(m)).length
    if (day.length >= 12 && bad / day.length > CONFIG.maxBadFraction) {
      drafts.push({
        ...base,
        category: 'data_quality',
        severity: 'LOW',
        title: `Много пропусков: ${info.label}`,
        description: `За 24 ч ${bad} из ${day.length} измерений «${info.label}» отсутствуют или сомнительны (${Math.round((bad / day.length) * 100)}%). Такие измерения исключены из анализа.`,
        next_step: 'Проверить датчик; не делать выводов по неполным данным.',
        data_quality: `Пропуски ${Math.round((bad / day.length) * 100)}%`,
        rule_id: 'DQ-2 missing_data',
        dedup_key: `DQ-2:${type}`,
        evidence_json: { metric: type, n: day.length, note: `${bad} невалидных` },
        period_start: new Date(now - 24 * HOUR).toISOString(),
        period_end: input.now.toISOString(),
      })
      note('data_quality', 'attention', 'LOW', `Много пропусков в «${info.label}».`)
    }
  }

  // Правило BL-1: устойчивое смещение относительно индивидуальной baseline.
  for (const type of SHIFT_METRICS) {
    const info = METRICS[type]
    const readings = byMetric.get(type) ?? []
    const b = computeBaseline(readings)
    if (!b) {
      note(info.category, 'insufficient_data', null, `Недостаточно данных для baseline «${info.label}».`)
      continue
    }
    baselines[type] = b
    const W = CONFIG.windowHours * HOUR
    const w1 = windowResidualZ(readings, b, now - W, now) // последние 12 ч
    const w2 = windowResidualZ(readings, b, now - 2 * W, now - W) // предыдущие 12 ч
    if (w1.z === null || w2.z === null) {
      note(info.category, 'insufficient_data', null, `Недостаточно свежих валидных данных «${info.label}» для анализа тенденции.`)
      continue
    }
    // «Устойчивое» = оба окна смещены в одну сторону; уровень — по меньшему смещению.
    const sameSide = Math.sign(w1.z) === Math.sign(w2.z)
    const sustainedZ = sameSide ? Math.min(Math.abs(w1.z), Math.abs(w2.z)) : 0
    const sev = shiftSeverity(sustainedZ)
    if (!sev) {
      note(info.category, 'ok', null, `«${info.label}» в пределах личной baseline (смещение ${sustainedZ.toFixed(1)}σ).`)
      continue
    }
    const dir = w1.z > 0 ? 'up' : 'down'
    const ev: Evidence = {
      metric: type,
      baseline: Number(w1.expected.toFixed(info.decimals)),
      current: Number(w1.current.toFixed(info.decimals)),
      unit: info.unit,
      n: w1.n + w2.n,
      note: `Смещение: ${w2.z.toFixed(1)}σ (12–24 ч назад) → ${w1.z.toFixed(1)}σ (последние 12 ч); σ = ${b.spread.toFixed(2)} ${info.unit}`,
    }
    drafts.push({
      ...base,
      category: info.category,
      severity: sev,
      title: `${info.label}: устойчивое ${dir === 'up' ? 'повышение' : 'снижение'} относительно личной baseline`,
      description: `Медиана за последние 12 ч — ${ev.current} ${info.unit}, ожидаемо по личной baseline для этих часов — ${ev.baseline} ${info.unit}. Смещение сохраняется 24 ч (${sustainedZ.toFixed(1)}σ). Это наблюдение, а не диагноз.`,
      next_step: sev === 'HIGH' ? 'Сообщить медицинскому специалисту миссии и следовать утверждённому протоколу.' : 'Продолжить наблюдение; при сохранении — обсудить со специалистом.',
      data_quality: `Валидных измерений: ${w1.n + w2.n} за 24 ч`,
      rule_id: 'BL-1 baseline_shift',
      dedup_key: `BL-1:${type}:${dir}`,
      evidence_json: ev,
      period_start: new Date(now - 2 * W).toISOString(),
      period_end: input.now.toISOString(),
    })
    note(info.category, 'attention', sev, `«${info.label}»: устойчивое смещение ${sustainedZ.toFixed(1)}σ.`)
  }

  // Правило SL-1: сокращение сна относительно личной истории.
  const nights = [...input.sleep].sort((a, b) => t(a.sleep_start) - t(b.sleep_start))
  if (nights.length >= CONFIG.sleepBaselineNights + CONFIG.sleepRecentNights) {
    const baseline = median(nights.slice(0, CONFIG.sleepBaselineNights).map((n) => n.duration_minutes))
    const recent = nights.slice(-CONFIG.sleepRecentNights)
    const drops = recent.map((n) => 1 - n.duration_minutes / baseline)
    const minDrop = Math.min(...drops) // устойчиво = каждая из последних ночей
    const sev: Severity | null = minDrop >= CONFIG.sleepDrop.MEDIUM ? 'MEDIUM' : minDrop >= CONFIG.sleepDrop.LOW ? 'LOW' : null
    const avg = recent.reduce((s, n) => s + n.duration_minutes, 0) / recent.length
    if (sev) {
      drafts.push({
        ...base,
        category: 'sleep',
        severity: sev,
        title: 'Сон короче личной нормы',
        description: `Последние ${recent.length} ночи: в среднем ${Math.round(avg)} мин против личной baseline ${Math.round(baseline)} мин (каждая ночь короче минимум на ${Math.round(minDrop * 100)}%).`,
        next_step: 'Проверить расписание и условия сна; обсудить со специалистом при сохранении.',
        data_quality: `${nights.length} ночей в истории`,
        rule_id: 'SL-1 sleep_reduction',
        dedup_key: 'SL-1:duration',
        evidence_json: { baseline: Math.round(baseline), current: Math.round(avg), unit: 'мин', n: recent.length },
        period_start: recent[0].sleep_start,
        period_end: recent[recent.length - 1].sleep_end,
      })
      note('sleep', 'attention', sev, `Сон сокращён на ≥${Math.round(minDrop * 100)}% относительно baseline.`)
    } else {
      note('sleep', 'ok', null, `Сон в пределах личной истории (≈${Math.round(avg)} мин против ${Math.round(baseline)} мин).`)
    }
  } else {
    note('sleep', 'insufficient_data', null, 'Недостаточно ночей для сравнения с личной историей.')
  }

  // Правило RD-1: доза за 24 ч относительно истории миссии (только при известных единицах).
  const rad = input.radiation.filter((r) => r.unit === 'mSv')
  if (rad.length) {
    const first = Math.min(...rad.map((r) => t(r.recorded_at)))
    const days = Math.floor((now - first) / (24 * HOUR))
    const daily: number[] = []
    for (let d = 1; d < days; d++) {
      const to = now - d * 24 * HOUR
      daily.push(rad.filter((r) => t(r.recorded_at) > to - 24 * HOUR && t(r.recorded_at) <= to).reduce((s, r) => s + r.measured_value, 0))
    }
    const last24 = rad.filter((r) => t(r.recorded_at) > now - 24 * HOUR).reduce((s, r) => s + r.measured_value, 0)
    if (daily.length >= 3) {
      const med = median(daily)
      const ratio = med > 0 ? last24 / med : 0
      const sev: Severity | null = ratio >= CONFIG.radiationRatio.MEDIUM ? 'MEDIUM' : ratio >= CONFIG.radiationRatio.LOW ? 'LOW' : null
      if (sev) {
        drafts.push({
          ...base,
          category: 'radiation',
          severity: sev,
          title: 'Повышенная доза за 24 ч относительно истории миссии',
          description: `Доза за последние 24 ч — ${last24.toFixed(2)} мЗв, медиана суточной дозы миссии — ${med.toFixed(2)} мЗв (×${ratio.toFixed(1)}).`,
          next_step: 'Сверить с данными дозиметрии миссии и следовать протоколу радиационной безопасности.',
          data_quality: `${rad.length} измерений дозиметра`,
          rule_id: 'RD-1 dose_rate_change',
          dedup_key: 'RD-1:daily_dose',
          evidence_json: { baseline: Number(med.toFixed(3)), current: Number(last24.toFixed(3)), unit: 'мЗв', n: daily.length },
          period_start: new Date(now - 24 * HOUR).toISOString(),
          period_end: input.now.toISOString(),
        })
        note('radiation', 'attention', sev, `Доза за 24 ч в ${ratio.toFixed(1)} раза выше медианы миссии.`)
      } else {
        note('radiation', 'ok', null, `Доза за 24 ч соответствует истории миссии (×${ratio.toFixed(1)}).`)
      }
    } else note('radiation', 'insufficient_data', null, 'Мало истории дозиметрии для сравнения.')
  } else note('radiation', 'insufficient_data', null, 'Нет измерений дозиметра — значения не подставляются.')

  // Правило SR-1: самоотчёт о самочувствии с высокой интенсивностью.
  const recentSymptoms = input.symptoms.filter((s) => t(s.recorded_at) > now - 24 * HOUR && s.intensity >= CONFIG.symptomIntensity)
  if (recentSymptoms.length) {
    const s = recentSymptoms.sort((a, b) => b.intensity - a.intensity)[0]
    drafts.push({
      ...base,
      category: 'behavioral',
      severity: 'LOW',
      title: `Самоотчёт: ${s.symptom_category}`,
      description: `Астронавт отметил «${s.symptom_category}» с интенсивностью ${s.intensity}/10: «${s.self_report}». Это самоотчёт, а не диагноз.`,
      next_step: 'Обсудить самочувствие с медицинским специалистом миссии.',
      data_quality: 'Субъективный самоотчёт',
      rule_id: 'SR-1 self_report',
      dedup_key: `SR-1:${s.symptom_category}`,
      evidence_json: { current: s.intensity, unit: '/10', note: s.self_report },
      period_start: s.recorded_at,
      period_end: input.now.toISOString(),
    })
    note('behavioral', 'attention', 'LOW', `Самоотчёт: «${s.symptom_category}» (${s.intensity}/10).`)
  } else note('behavioral', 'ok', null, 'Нет самоотчётов высокой интенсивности за 24 ч.')

  const order: RiskCategory[] = ['cardiovascular', 'respiratory', 'thermoregulation', 'sleep', 'radiation', 'behavioral', 'data_quality']
  if (!catState.has('data_quality')) note('data_quality', 'ok', null, 'Данные свежие, пропусков мало.')
  const assessments = order.filter((c) => catState.has(c)).map((c) => catState.get(c)!)
  return { drafts, assessments, baselines }
}

// ─────────── сверка с уже сохранёнными предупреждениями (без дублей) ───────────
export interface Reconciliation {
  toInsert: AlertDraft[]
  toUpdate: { id: string; patch: Partial<HealthAlert> }[] // эскалация уровня / новые цифры
  toResolve: string[] // id предупреждений, условие которых больше не выполняется
}

export function reconcile(existing: HealthAlert[], drafts: AlertDraft[]): Reconciliation {
  const open = existing.filter((a) => a.status !== 'resolved')
  const openByKey = new Map(open.map((a) => [a.dedup_key, a]))
  const draftKeys = new Set(drafts.map((d) => d.dedup_key))
  const out: Reconciliation = { toInsert: [], toUpdate: [], toResolve: [] }
  for (const d of drafts) {
    const cur = openByKey.get(d.dedup_key)
    if (!cur) out.toInsert.push(d)
    else if (sevRank[d.severity] > sevRank[cur.severity]) {
      out.toUpdate.push({ id: cur.id, patch: { severity: d.severity, description: d.description, evidence_json: d.evidence_json, period_end: d.period_end, status: 'active' } })
    }
  }
  for (const a of open) if (!draftKeys.has(a.dedup_key)) out.toResolve.push(a.id)
  return out
}
