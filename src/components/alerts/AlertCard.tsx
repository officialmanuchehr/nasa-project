// Карточка предупреждения: причина, доказательства, период, качество данных,
// правило и версия, рекомендуемый следующий шаг.
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { HealthAlert } from '../../types'
import { CATEGORY_LABELS } from '../../features/health/metrics'
import { SeverityBadge, StatusText } from '../ui'
import { locale, tr } from '../../lib/i18n'

const dt = (iso: string) => new Date(iso).toLocaleString(locale(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export function AlertCard({ alert, onAck, compact }: { alert: HealthAlert; onAck?: (id: string) => void; compact?: boolean }) {
  const [open, setOpen] = useState(!compact)
  const e = alert.evidence_json
  return (
    <article className="rounded-xl border border-space-700 bg-space-850/60 p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={alert.severity} />
        <span className="text-xs text-ink-mute">{CATEGORY_LABELS[alert.category]}</span>
        <span className="ml-auto">
          <StatusText status={alert.status} />
        </span>
      </div>
      <button onClick={() => setOpen((v) => !v)} className="mt-2 flex w-full items-start justify-between gap-2 text-left" aria-expanded={open}>
        <h3 className="text-sm font-semibold">{alert.title}</h3>
        <ChevronDown size={16} className={`mt-0.5 shrink-0 text-ink-mute transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-2 space-y-2 text-sm">
          <p className="text-ink-dim">{alert.description}</p>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
            {e.baseline !== undefined && (
              <Row k={tr('Личная baseline', 'Personal baseline')} v={`${e.baseline} ${e.unit ?? ''}`} />
            )}
            {e.current !== undefined && <Row k={tr('Текущее значение', 'Current value')} v={`${e.current} ${e.unit ?? ''}`} />}
            <Row k={tr('Период', 'Period')} v={`${dt(alert.period_start)} — ${dt(alert.period_end)}`} />
            <Row k={tr('Качество данных', 'Data quality')} v={alert.data_quality} />
            <Row k={tr('Правило', 'Rule')} v={`${alert.rule_id} · ${alert.ruleset_version}`} />
            <Row k={tr('Создано', 'Created')} v={dt(alert.created_at)} />
          </dl>
          {e.note && <p className="font-mono text-[11px] text-ink-mute">{e.note}</p>}
          <div className="rounded-lg border border-accent/25 bg-accent/5 px-3 py-2 text-xs">
            <span className="font-semibold text-accent">{tr('Следующий шаг', 'Next step')}: </span>
            {alert.next_step}
          </div>
          {onAck && alert.status === 'active' && (
            <button onClick={() => onAck(alert.id)} className="rounded-lg border border-space-600 px-3 py-1.5 text-xs font-semibold hover:bg-space-800">
              {tr('Подтвердить ознакомление', 'Acknowledge')}
            </button>
          )}
        </div>
      )}
    </article>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-ink-mute">{k}:</dt>
      <dd className="font-mono text-ink">{v}</dd>
    </div>
  )
}
