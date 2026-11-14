// Тесты Risk Engine: каждый сценарий симулятора должен давать ожидаемые предупреждения.
import { describe, expect, it } from 'vitest'
import { evaluate, reconcile } from './engine'
import { generateHistory, type Scenario } from '../simulator/simulator'
import type { HealthAlert } from '../../types'

const now = new Date('2026-11-14T12:00:00Z')
function run(scenario: Scenario) {
  const h = generateHistory({ astronautId: 'a', missionId: 'm', scenario, seed: 42, end: now }, 21)
  return evaluate({ astronautId: 'a', missionId: 'm', ...h, symptoms: [], now })
}
const rules = (s: Scenario) => run(s).drafts.map((d) => d.dedup_key).sort()

describe('risk engine', () => {
  it('normal: нет предупреждений', () => {
    expect(rules('normal')).toEqual([])
  })
  it('stale_sensor: только предупреждение о качестве данных SpO₂, без медицинского', () => {
    const r = rules('stale_sensor')
    expect(r).toContain('DQ-1:spo2')
    expect(r.some((k) => k.startsWith('BL-1:spo2'))).toBe(false)
  })
  it('gaps: предупреждения о пропусках, без ложных медицинских', () => {
    const r = rules('gaps')
    expect(r.some((k) => k.startsWith('DQ-2'))).toBe(true)
    expect(r.some((k) => k.startsWith('BL-1'))).toBe(false)
  })
  it('trend_change: пульс, температура, сон, радиация', () => {
    const r = rules('trend_change')
    expect(r).toContain('BL-1:heart_rate:up')
    expect(r).toContain('BL-1:body_temp:up')
    expect(r).toContain('SL-1:duration')
    expect(r).toContain('RD-1:daily_dose')
  })
  it('каждое предупреждение объяснимо', () => {
    for (const d of run('trend_change').drafts) {
      expect(d.rule_id && d.ruleset_version && d.next_step && d.description && d.data_quality).toBeTruthy()
      expect(d.severity).not.toBe('CRITICAL')
    }
  })
  it('reconcile: без дублей, эскалация и авто-закрытие', () => {
    const drafts = run('trend_change').drafts
    const saved: HealthAlert[] = drafts.map((d, i) => ({ ...d, id: String(i), status: 'active', created_at: '', resolved_at: null, severity: 'LOW' }))
    const r1 = reconcile(saved, drafts)
    expect(r1.toInsert).toHaveLength(0)
    expect(r1.toUpdate.length).toBeGreaterThan(0)
    const r2 = reconcile(saved, [])
    expect(r2.toResolve).toHaveLength(saved.length)
  })
})

// Устойчивость к случайному seed: в приложении seed случайный.
describe('robustness across seeds', () => {
  it('normal не даёт медицинских предупреждений, trend_change даёт ожидаемые', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const gen = (scenario: Scenario) => {
        const h = generateHistory({ astronautId: 'a', missionId: 'm', scenario, seed, end: now }, 21)
        return evaluate({ astronautId: 'a', missionId: 'm', ...h, symptoms: [], now }).drafts.map((d) => d.dedup_key)
      }
      expect(gen('normal'), `seed ${seed}`).toEqual([])
      const t = gen('trend_change')
      for (const k of ['BL-1:heart_rate:up', 'BL-1:body_temp:up', 'SL-1:duration', 'RD-1:daily_dose']) expect(t, `seed ${seed}`).toContain(k)
    }
  })
})
