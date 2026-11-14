// Общие типы StarTime+. Совпадают с колонками таблиц Supabase (snake_case).

export type MetricType =
  | 'heart_rate'
  | 'spo2'
  | 'body_temp'
  | 'systolic_bp'
  | 'diastolic_bp'
  | 'activity'

export type QualityStatus = 'ok' | 'missing' | 'stale' | 'suspect'
export type DataSource = 'simulator' | 'sensor' | 'import' | 'manual'
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type AlertStatus = 'active' | 'acknowledged' | 'resolved'
export type Role = 'astronaut' | 'medical_officer' | 'admin'
export type RiskCategory =
  | 'cardiovascular'
  | 'respiratory'
  | 'thermoregulation'
  | 'sleep'
  | 'radiation'
  | 'behavioral'
  | 'data_quality'

export interface HealthMetric {
  id: string
  astronaut_id: string
  mission_id: string
  metric_type: MetricType
  value: number | null // NULL = измерения нет (не подставляем случайные числа)
  unit: string
  recorded_at: string // ISO
  data_source: DataSource
  is_simulated: boolean
  quality_status: QualityStatus
}

export interface SleepRecord {
  id: string
  astronaut_id: string
  mission_id: string
  sleep_start: string
  sleep_end: string
  duration_minutes: number
  quality_data: { awakenings?: number } | null
  data_source: DataSource
  is_simulated: boolean
}

export interface RadiationRecord {
  id: string
  astronaut_id: string
  mission_id: string
  measured_value: number // доза за период измерения
  unit: string // 'mSv'
  recorded_at: string
  instrument_source: string
  is_simulated: boolean
}

export interface SymptomLog {
  id: string
  astronaut_id: string
  mission_id: string
  symptom_category: string
  self_report: string
  intensity: number // 0..10, самооценка
  recorded_at: string
  is_simulated: boolean
}

export interface Evidence {
  metric?: MetricType
  baseline?: number
  current?: number
  unit?: string
  n?: number
  note?: string
}

export interface HealthAlert {
  id: string
  astronaut_id: string
  mission_id: string
  category: RiskCategory
  severity: Severity
  title: string
  description: string
  next_step: string
  data_quality: string
  rule_id: string
  ruleset_version: string
  dedup_key: string
  evidence_json: Evidence
  period_start: string
  period_end: string
  status: AlertStatus
  created_at: string
  resolved_at: string | null
}

export interface Mission {
  id: string
  name: string
  mission_code: string
  start_date: string
  end_date: string | null
  status: string
  environment_json: Record<string, string> | null
  is_demo: boolean
}

export interface Profile {
  id: string
  display_name: string
  role: Role
}

export interface CrewMember {
  profile_id: string
  display_name: string
  mission_role: string
}

export interface OrbitSource {
  title: string
  url: string
  publisher: string
}
