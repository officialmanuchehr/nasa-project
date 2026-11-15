// Пульт симулятора: выбор сценария, Live-режим (точка каждые 10 с), сброс.
// Для врача миссии — переключатель просматриваемого астронавта.
import { useState } from 'react'
import { FlaskConical, Pause, Play, RotateCcw } from 'lucide-react'
import { useData } from '../../features/health/DataProvider'
import { SCENARIOS, type Scenario } from '../../features/simulator/simulator'
import { tr } from '../../lib/i18n'

export function SimulatorPanel() {
  const { scenario, runScenario, live, setLive, resetSimulation, busy, profile, viewingId, crew, setViewingId } = useData()
  const [open, setOpen] = useState(false)
  const isSelf = profile?.id === viewingId
  const canPickCrew = profile?.role === 'medical_officer' && crew.length > 1

  return (
    <div className="relative flex items-center gap-2">
      {canPickCrew && (
        <select
          value={viewingId ?? ''}
          onChange={(e) => setViewingId(e.target.value)}
          className="rounded-lg border border-space-600 bg-space-900 px-2 py-1.5 text-xs"
          aria-label={tr('Просматриваемый астронавт', 'Astronaut being viewed')}
        >
          {crew.map((c) => (
            <option key={c.profile_id} value={c.profile_id}>
              {c.display_name}
            </option>
          ))}
        </select>
      )}
      {live && (
        <span className="flex items-center gap-1.5 rounded-md bg-ok/10 px-2 py-1 text-[11px] font-semibold text-ok">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" /> LIVE
        </span>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={!isSelf}
        className="flex items-center gap-1.5 rounded-lg border border-accent-2/40 bg-accent-2/10 px-3 py-1.5 text-xs font-semibold text-accent-2 hover:bg-accent-2/20 disabled:opacity-40"
        aria-expanded={open}
      >
        <FlaskConical size={14} /> {tr('Симулятор', 'Simulator')}
      </button>
      {open && (
        <div className="panel absolute right-0 top-11 z-50 w-[min(92vw,340px)] p-4 shadow-2xl">
          <div className="label-caps mb-1">{tr('Сценарий демонстрации', 'Demo scenario')}</div>
          <p className="mb-3 text-xs text-ink-mute">{tr('Генерирует 21 день истории. Все записи помечаются как симуляция.', 'Generates 21 days of history. All records are marked as simulated.')}</p>
          <div className="flex flex-col gap-1.5">
            {(Object.keys(SCENARIOS) as Scenario[]).map((s) => (
              <button
                key={s}
                disabled={busy}
                onClick={() => runScenario(s)}
                className={`rounded-lg border px-3 py-2 text-left transition disabled:opacity-50 ${
                  scenario === s ? 'border-accent bg-accent/10' : 'border-space-700 hover:bg-space-800'
                }`}
              >
                <div className="text-sm font-medium">{SCENARIOS[s].label}</div>
                <div className="text-xs text-ink-mute">{SCENARIOS[s].description}</div>
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setLive(!live)}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-space-600 px-3 py-2 text-xs font-semibold hover:bg-space-800"
            >
              {live ? <Pause size={14} /> : <Play size={14} />} {live ? tr('Остановить Live', 'Stop Live') : tr('Запустить Live', 'Start Live')}
            </button>
            <button
              onClick={resetSimulation}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg border border-critical/40 px-3 py-2 text-xs font-semibold text-critical hover:bg-critical/10"
            >
              <RotateCcw size={14} /> {tr('Сброс', 'Reset')}
            </button>
          </div>
          {busy && <p className="mt-2 text-xs text-accent">{tr('Генерация и сохранение данных…', 'Generating and saving data…')}</p>}
        </div>
      )}
    </div>
  )
}
