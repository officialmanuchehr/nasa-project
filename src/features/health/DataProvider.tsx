// Центральное хранилище данных StarTime+.
// • Если Supabase настроен — авторизация, чтение/запись в БД (с RLS) и Realtime.
// • Если нет — локальный демо-режим в памяти (всё помечено как симуляция).
// Risk Engine запускается при каждом изменении данных; новые предупреждения
// сверяются с сохранёнными (без дублей), устаревшие — закрываются.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { getLang, tr, useLang } from '../../lib/i18n'
import type { CrewMember, HealthAlert, HealthMetric, Mission, Profile, RadiationRecord, SleepRecord, SymptomLog } from '../../types'
import { evaluate, reconcile, type EngineOutput } from '../risk-detection/engine'
import { generateHistory, generateLivePoint, type Scenario } from '../simulator/simulator'

const DEMO_MISSION: Mission = {
  id: '00000000-0000-0000-0000-000000000001',
  get name() { return tr('Deep Horizon (демо)', 'Deep Horizon (demo)') },
  mission_code: 'STM-01',
  start_date: new Date(Date.now() - 21 * 86400_000).toISOString(),
  end_date: new Date(Date.now() + 160 * 86400_000).toISOString(),
  status: 'active',
  get environment_json(): Record<string, string> {
    return getLang() === 'en'
      ? { Type: 'Long-duration mission (simulated)', Gravity: 'Microgravity', Crew: '4 people' }
      : { 'Тип': 'Длительная миссия (симуляция)', 'Гравитация': 'Микрогравитация', 'Экипаж': '4 человека' }
  },
  is_demo: true,
}
const DEMO_PROFILE: Profile = {
  id: '00000000-0000-0000-0000-0000000000a1',
  get display_name() { return tr('Демо-астронавт', 'Demo astronaut') },
  role: 'astronaut',
}

interface DataState {
  mode: 'supabase' | 'demo'
  session: Session | null
  authReady: boolean
  profile: Profile | null
  mission: Mission | null
  crew: CrewMember[]
  viewingId: string | null
  setViewingId: (id: string) => void
  metrics: HealthMetric[]
  sleep: SleepRecord[]
  radiation: RadiationRecord[]
  symptoms: SymptomLog[]
  alerts: HealthAlert[]
  engine: EngineOutput | null
  loading: boolean
  error: string | null
  scenario: Scenario
  live: boolean
  busy: boolean
  runScenario: (s: Scenario) => Promise<void>
  resetSimulation: () => Promise<void>
  setLive: (v: boolean) => void
  addSymptom: (category: string, text: string, intensity: number) => Promise<void>
  acknowledge: (id: string) => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<DataState | null>(null)
export const useData = () => {
  const c = useContext(Ctx)
  if (!c) throw new Error('useData outside DataProvider')
  return c
}

const DAYS = 21
const LIVE_MS = 10_000

// Supabase отдаёт максимум 1000 строк за запрос — читаем страницами.
async function fetchAll<T>(table: string, astronautId: string, orderCol: string, sinceIso: string, timeCol: string): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase!
      .from(table)
      .select('*')
      .eq('astronaut_id', astronautId)
      .gte(timeCol, sinceIso)
      .order(orderCol, { ascending: true })
      .range(from, from + 999)
    if (error) throw error
    out.push(...(data as T[]))
    if (!data || data.length < 1000) break
  }
  return out
}
async function insertChunks(table: string, rows: object[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase!.from(table).insert(rows.slice(i, i + 500))
    if (error) throw error
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const mode = supabase ? 'supabase' : 'demo'
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(mode === 'demo')
  const [profile, setProfile] = useState<Profile | null>(mode === 'demo' ? DEMO_PROFILE : null)
  const [mission, setMission] = useState<Mission | null>(mode === 'demo' ? DEMO_MISSION : null)
  const [crew, setCrew] = useState<CrewMember[]>(
    mode === 'demo'
      ? [{ profile_id: DEMO_PROFILE.id, get display_name() { return DEMO_PROFILE.display_name }, get mission_role() { return tr('Бортинженер', 'Flight engineer') } }]
      : [],
  )
  const [viewingId, setViewingId] = useState<string | null>(mode === 'demo' ? DEMO_PROFILE.id : null)
  const [metrics, setMetrics] = useState<HealthMetric[]>([])
  const [sleep, setSleep] = useState<SleepRecord[]>([])
  const [radiation, setRadiation] = useState<RadiationRecord[]>([])
  const [symptoms, setSymptoms] = useState<SymptomLog[]>([])
  const [alerts, setAlerts] = useState<HealthAlert[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scenario, setScenario] = useState<Scenario>('normal')
  const [live, setLive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const syncing = useRef(false)
  const { lang } = useLang()

  const isSelf = !!profile && viewingId === profile.id

  // ── Авторизация ──
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // ── Профиль, миссия, экипаж ──
  useEffect(() => {
    if (!supabase || !session) return
    ;(async () => {
      try {
        const uid = session.user.id
        const { data: p, error: pe } = await supabase.from('profiles').select('id, display_name, role').eq('id', uid).single()
        if (pe) throw pe
        setProfile(p as Profile)
        setViewingId((v) => v ?? uid)
        const { data: mm } = await supabase.from('mission_members').select('mission_id').eq('profile_id', uid).limit(1)
        const missionId = mm?.[0]?.mission_id
        if (!missionId) return
        const { data: m } = await supabase.from('missions').select('*').eq('id', missionId).single()
        setMission(m as Mission)
        const { data: c } = await supabase.from('mission_members').select('profile_id, mission_role, profiles(display_name)').eq('mission_id', missionId)
        setCrew(
          (c ?? []).map((r: { profile_id: string; mission_role: string; profiles: { display_name: string } | { display_name: string }[] | null }) => ({
            profile_id: r.profile_id,
            mission_role: r.mission_role,
            display_name: (Array.isArray(r.profiles) ? r.profiles[0]?.display_name : r.profiles?.display_name) ?? tr('Участник', 'Member'),
          })),
        )
      } catch (e) {
        setError((e as Error).message)
      }
    })()
  }, [session])

  // ── Загрузка данных просматриваемого астронавта ──
  const load = useCallback(async () => {
    if (!supabase || !viewingId) return
    setLoading(true)
    try {
      const since = new Date(Date.now() - (DAYS + 1) * 86400_000).toISOString()
      const [m, s, r, sy, a] = await Promise.all([
        fetchAll<HealthMetric>('health_metrics', viewingId, 'recorded_at', since, 'recorded_at'),
        fetchAll<SleepRecord>('sleep_records', viewingId, 'sleep_start', since, 'sleep_start'),
        fetchAll<RadiationRecord>('radiation_records', viewingId, 'recorded_at', since, 'recorded_at'),
        fetchAll<SymptomLog>('symptom_logs', viewingId, 'recorded_at', since, 'recorded_at'),
        fetchAll<HealthAlert>('health_alerts', viewingId, 'created_at', '1970-01-01', 'created_at'),
      ])
      setMetrics(m)
      setSleep(s)
      setRadiation(r)
      setSymptoms(sy)
      setAlerts(a.reverse())
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [viewingId])

  useEffect(() => {
    load()
  }, [load])

  // ── Realtime: новые измерения и изменения предупреждений ──
  useEffect(() => {
    if (!supabase || !viewingId) return
    const ch = supabase
      .channel(`astronaut-${viewingId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'health_metrics', filter: `astronaut_id=eq.${viewingId}` }, (p) =>
        setMetrics((xs) => (xs.some((x) => x.id === (p.new as HealthMetric).id) ? xs : [...xs, p.new as HealthMetric])),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'health_alerts', filter: `astronaut_id=eq.${viewingId}` }, (p) => {
        const row = p.new as HealthAlert
        if (!row?.id) return
        setAlerts((xs) => (xs.some((x) => x.id === row.id) ? xs.map((x) => (x.id === row.id ? row : x)) : [row, ...xs]))
      })
      .subscribe()
    return () => {
      supabase!.removeChannel(ch)
    }
  }, [viewingId])

  // ── Демо-режим: стартовые данные ──
  useEffect(() => {
    if (mode !== 'demo') return
    const h = generateHistory({ astronautId: DEMO_PROFILE.id, missionId: DEMO_MISSION.id, scenario: 'normal', seed: 7, end: new Date() }, DAYS)
    setMetrics(h.metrics)
    setSleep(h.sleep)
    setRadiation(h.radiation)
  }, [mode])

  // Часы для движка: пересчёт раз в минуту
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // ── Risk Engine ──
  const engine = useMemo(() => {
    if (!viewingId || !mission) return null
    return evaluate({ astronautId: viewingId, missionId: mission.id, metrics, sleep, radiation, symptoms, now: new Date(Math.max(now.getTime(), Date.now())) })
    // lang в зависимостях: тексты предупреждений и оценок пересчитываются на новом языке
  }, [viewingId, mission, metrics, sleep, radiation, symptoms, now, lang])

  // Смена языка: обновляем тексты уже открытых предупреждений (только в памяти, без записи в БД)
  useEffect(() => {
    if (!engine) return
    const byKey = new Map(engine.drafts.map((d) => [d.dedup_key, d]))
    setAlerts((xs) => {
      let changed = false
      const next = xs.map((a) => {
        const d = a.status !== 'resolved' ? byKey.get(a.dedup_key) : undefined
        if (!d || d.title === a.title) return a
        changed = true
        return { ...a, title: d.title, description: d.description, next_step: d.next_step, data_quality: d.data_quality, evidence_json: d.evidence_json }
      })
      return changed ? next : xs
    })
  }, [engine])

  // Сверка с сохранёнными предупреждениями (только для своих данных)
  useEffect(() => {
    if (!engine || !isSelf || loading || syncing.current) return
    const rec = reconcile(alerts, engine.drafts)
    if (!rec.toInsert.length && !rec.toUpdate.length && !rec.toResolve.length) return
    syncing.current = true
    const stamp = new Date().toISOString()
    ;(async () => {
      try {
        if (supabase) {
          if (rec.toInsert.length) {
            const { data, error: e } = await supabase.from('health_alerts').insert(rec.toInsert).select('*')
            if (e && e.code !== '23505') throw e // 23505 = дубль (уже создан другим окном)
            if (data) setAlerts((xs) => [...(data as HealthAlert[]), ...xs.filter((x) => !data.some((d) => d.id === x.id))])
          }
          for (const u of rec.toUpdate) await supabase.from('health_alerts').update(u.patch).eq('id', u.id)
          if (rec.toResolve.length) await supabase.from('health_alerts').update({ status: 'resolved', resolved_at: stamp }).in('id', rec.toResolve)
        }
        setAlerts((xs) => {
          let next = xs.map((a) => {
            if (rec.toResolve.includes(a.id)) return { ...a, status: 'resolved' as const, resolved_at: stamp }
            const u = rec.toUpdate.find((x) => x.id === a.id)
            return u ? { ...a, ...u.patch } : a
          })
          if (!supabase) {
            next = [...rec.toInsert.map((d) => ({ ...d, id: crypto.randomUUID(), status: 'active' as const, created_at: stamp, resolved_at: null })), ...next]
          }
          return next
        })
      } catch (e) {
        setError((e as Error).message)
      } finally {
        syncing.current = false
      }
    })()
  }, [engine, isSelf, loading, alerts])

  // ── Симулятор ──
  const ctxFor = useCallback(
    (s: Scenario) => ({ astronautId: profile!.id, missionId: mission!.id, scenario: s, seed: Math.floor(Math.random() * 1e9), end: new Date() }),
    [profile, mission],
  )

  const clearSimulated = useCallback(async () => {
    if (!supabase || !profile) return
    for (const t of ['health_metrics', 'sleep_records', 'radiation_records', 'symptom_logs']) {
      const { error: e } = await supabase.from(t).delete().eq('astronaut_id', profile.id).eq('is_simulated', true)
      if (e) throw e
    }
    const { error: e } = await supabase.from('health_alerts').delete().eq('astronaut_id', profile.id)
    if (e) throw e
  }, [profile])

  const runScenario = useCallback(
    async (s: Scenario) => {
      if (!profile || !mission) return
      setBusy(true)
      setScenario(s)
      try {
        const h = generateHistory(ctxFor(s), DAYS)
        if (supabase) {
          await clearSimulated()
          await insertChunks('health_metrics', h.metrics)
          await insertChunks('sleep_records', h.sleep)
          await insertChunks('radiation_records', h.radiation)
          setAlerts([])
          await load()
        } else {
          setAlerts([])
          setSymptoms([])
          setMetrics(h.metrics)
          setSleep(h.sleep)
          setRadiation(h.radiation)
        }
        setNow(new Date())
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setBusy(false)
      }
    },
    [profile, mission, ctxFor, clearSimulated, load],
  )

  const resetSimulation = useCallback(async () => {
    setBusy(true)
    setLive(false)
    try {
      await clearSimulated()
      setMetrics([])
      setSleep([])
      setRadiation([])
      setSymptoms([])
      setAlerts([])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }, [clearSimulated])

  // Live-режим: новая точка каждые 10 секунд
  useEffect(() => {
    if (!live || !profile || !mission || !isSelf) return
    const id = setInterval(async () => {
      const pts = generateLivePoint(ctxFor(scenario), new Date())
      if (supabase) {
        const { error: e } = await supabase.from('health_metrics').insert(pts)
        if (e) setError(e.message)
      }
      setMetrics((xs) => [...xs, ...pts.filter((p) => !xs.some((x) => x.id === p.id))])
      setNow(new Date())
    }, LIVE_MS)
    return () => clearInterval(id)
  }, [live, profile, mission, isSelf, scenario, ctxFor])

  const addSymptom = useCallback(
    async (category: string, text: string, intensity: number) => {
      if (!profile || !mission) return
      const row: SymptomLog = {
        id: crypto.randomUUID(),
        astronaut_id: profile.id,
        mission_id: mission.id,
        symptom_category: category,
        self_report: text,
        intensity,
        recorded_at: new Date().toISOString(),
        is_simulated: false,
      }
      if (supabase) {
        const { error: e } = await supabase.from('symptom_logs').insert(row)
        if (e) return setError(e.message)
      }
      setSymptoms((xs) => [...xs, row])
    },
    [profile, mission],
  )

  const acknowledge = useCallback(async (id: string) => {
    if (supabase) {
      const { error: e } = await supabase.from('health_alerts').update({ status: 'acknowledged' }).eq('id', id)
      if (e) return setError(e.message)
    }
    setAlerts((xs) => xs.map((a) => (a.id === id ? { ...a, status: 'acknowledged' } : a)))
  }, [])

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut()
    setProfile(null)
    setViewingId(null)
    setMetrics([])
    setAlerts([])
  }, [])

  const value: DataState = {
    mode, session, authReady, profile, mission, crew, viewingId, setViewingId,
    metrics, sleep, radiation, symptoms, alerts, engine, loading, error,
    scenario, live, busy, runScenario, resetSimulation, setLive, addSymptom, acknowledge, signOut,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
