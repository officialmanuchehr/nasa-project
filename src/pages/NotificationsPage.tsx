// Notifications: история предупреждений, фильтр по статусу, подтверждение ознакомления.
import { useState } from 'react'
import { useData } from '../features/health/DataProvider'
import { Empty, PageHeader } from '../components/ui'
import { AlertCard } from '../components/alerts/AlertCard'
import type { AlertStatus } from '../types'
import { tr } from '../lib/i18n'

const FILTERS = (): { key: AlertStatus | 'all'; label: string }[] => [
  { key: 'all', label: tr('Все', 'All') },
  { key: 'active', label: tr('Активные', 'Active') },
  { key: 'acknowledged', label: tr('Ознакомлен', 'Acknowledged') },
  { key: 'resolved', label: tr('Закрытые', 'Resolved') },
]

export default function NotificationsPage() {
  const { alerts, acknowledge } = useData()
  const [f, setF] = useState<AlertStatus | 'all'>('all')
  const list = f === 'all' ? alerts : alerts.filter((a) => a.status === f)
  return (
    <div>
      <PageHeader
        title={tr('Уведомления', 'Notifications')}
        subtitle={tr('История предупреждений и их статусы', 'Alert history and statuses')}
        right={
          <div className="flex rounded-lg border border-space-600 p-0.5">
            {FILTERS().map((x) => (
              <button key={x.key} onClick={() => setF(x.key)} className={`rounded-md px-3 py-1 text-xs ${f === x.key ? 'bg-accent text-space-950' : 'text-ink-dim'}`}>
                {x.label} ({x.key === 'all' ? alerts.length : alerts.filter((a) => a.status === x.key).length})
              </button>
            ))}
          </div>
        }
      />
      {list.length ? (
        <div className="space-y-3">
          {list.map((a) => (
            <AlertCard key={a.id} alert={a} onAck={acknowledge} compact />
          ))}
        </div>
      ) : (
        <Empty>{tr('Нет предупреждений в этой категории.', 'No alerts in this category.')}</Empty>
      )}
    </div>
  )
}
