// Справочник показателей: подписи, единицы, техническая валидность датчика.
// ВАЖНО: validRange — это ТЕХНИЧЕСКИЙ диапазон (за его пределами значение считается
// ошибкой датчика), а не медицинская норма. Медицинских порогов здесь нет.
import type { MetricType, RiskCategory } from '../../types'
import { tr } from '../../lib/i18n'

export interface MetricInfo {
  label: string
  short: string
  unit: string
  decimals: number
  validRange: [number, number]
  category: RiskCategory
  color: string
}

// label / short / unit — геттеры: строка вычисляется на текущем языке при каждом обращении.
const m = (ru: [string, string, string], en: [string, string, string], rest: Omit<MetricInfo, 'label' | 'short' | 'unit'>): MetricInfo => ({
  get label() { return tr(ru[0], en[0]) },
  get short() { return tr(ru[1], en[1]) },
  get unit() { return tr(ru[2], en[2]) },
  ...rest,
})

export const METRICS: Record<MetricType, MetricInfo> = {
  heart_rate: m(['Пульс', 'ЧСС', 'уд/мин'], ['Heart rate', 'HR', 'bpm'], { decimals: 0, validRange: [20, 250], category: 'cardiovascular', color: '#f472b6' }),
  spo2: m(['Сатурация SpO₂', 'SpO₂', '%'], ['Oxygen saturation SpO₂', 'SpO₂', '%'], { decimals: 0, validRange: [50, 100], category: 'respiratory', color: '#38bdf8' }),
  body_temp: m(['Температура тела', 'Темп.', '°C'], ['Body temperature', 'Temp.', '°C'], { decimals: 1, validRange: [30, 43], category: 'thermoregulation', color: '#fb923c' }),
  systolic_bp: m(['Давление (сист.)', 'САД', 'мм рт. ст.'], ['Blood pressure (sys.)', 'SBP', 'mmHg'], { decimals: 0, validRange: [60, 260], category: 'cardiovascular', color: '#a78bfa' }),
  diastolic_bp: m(['Давление (диаст.)', 'ДАД', 'мм рт. ст.'], ['Blood pressure (dia.)', 'DBP', 'mmHg'], { decimals: 0, validRange: [30, 160], category: 'cardiovascular', color: '#c4b5fd' }),
  activity: m(['Активность', 'Акт.', 'мин/ч'], ['Activity', 'Act.', 'min/h'], { decimals: 0, validRange: [0, 60], category: 'cardiovascular', color: '#4ade80' }),
}

export const METRIC_TYPES = Object.keys(METRICS) as MetricType[]

export const CATEGORY_LABELS: Record<RiskCategory, string> = {
  get cardiovascular() { return tr('Сердечно-сосудистая система', 'Cardiovascular') },
  get respiratory() { return tr('Дыхание / оксигенация', 'Respiration / oxygenation') },
  get thermoregulation() { return tr('Терморегуляция', 'Thermoregulation') },
  get sleep() { return tr('Сон', 'Sleep') },
  get radiation() { return tr('Радиация', 'Radiation') },
  get behavioral() { return tr('Самочувствие (самоотчёт)', 'Well-being (self-report)') },
  get data_quality() { return tr('Качество данных', 'Data quality') },
}

export function fmt(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return value.toFixed(decimals)
}
