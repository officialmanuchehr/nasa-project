// Справочник показателей: подписи, единицы, техническая валидность датчика.
// ВАЖНО: validRange — это ТЕХНИЧЕСКИЙ диапазон (за его пределами значение считается
// ошибкой датчика), а не медицинская норма. Медицинских порогов здесь нет.
import type { MetricType, RiskCategory } from '../../types'

export interface MetricInfo {
  label: string
  short: string
  unit: string
  decimals: number
  validRange: [number, number]
  category: RiskCategory
  color: string
}

export const METRICS: Record<MetricType, MetricInfo> = {
  heart_rate: { label: 'Пульс', short: 'ЧСС', unit: 'уд/мин', decimals: 0, validRange: [20, 250], category: 'cardiovascular', color: '#f472b6' },
  spo2: { label: 'Сатурация SpO₂', short: 'SpO₂', unit: '%', decimals: 0, validRange: [50, 100], category: 'respiratory', color: '#38bdf8' },
  body_temp: { label: 'Температура тела', short: 'Темп.', unit: '°C', decimals: 1, validRange: [30, 43], category: 'thermoregulation', color: '#fb923c' },
  systolic_bp: { label: 'Давление (сист.)', short: 'САД', unit: 'мм рт. ст.', decimals: 0, validRange: [60, 260], category: 'cardiovascular', color: '#a78bfa' },
  diastolic_bp: { label: 'Давление (диаст.)', short: 'ДАД', unit: 'мм рт. ст.', decimals: 0, validRange: [30, 160], category: 'cardiovascular', color: '#c4b5fd' },
  activity: { label: 'Активность', short: 'Акт.', unit: 'мин/ч', decimals: 0, validRange: [0, 60], category: 'cardiovascular', color: '#4ade80' },
}

export const METRIC_TYPES = Object.keys(METRICS) as MetricType[]

export const CATEGORY_LABELS: Record<RiskCategory, string> = {
  cardiovascular: 'Сердечно-сосудистая система',
  respiratory: 'Дыхание / оксигенация',
  thermoregulation: 'Терморегуляция',
  sleep: 'Сон',
  radiation: 'Радиация',
  behavioral: 'Самочувствие (самоотчёт)',
  data_quality: 'Качество данных',
}

export function fmt(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return value.toFixed(decimals)
}
