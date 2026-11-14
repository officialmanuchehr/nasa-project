// Notifications: история предупреждений, фильтр по статусу, подтверждение ознакомления.
import { useState } from 'react'
import { useData } from '../features/health/DataProvider'
import { Empty, PageHeader } from '../components/ui'
import { AlertCard } from '../components/alerts/AlertCard'
import type { AlertStatus } from '../types'

const FILTERS: { key: AlertStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'active', label: 'Активные' },
  { key: 'acknowledged', label: 'Ознакомлен' },
  { key: 'resolved', label: 'Закрытые' },
]

export default function NotificationsPage() {
  const { alerts, acknowledge } = useData()
  const [f, setF] = useState<AlertStatus | 'all'>('all')
  const list = f === 'all' ? alerts : alerts.filter((a) => a.status === f)
  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="История предупреждений и их статусы"
        right={
          <div className="flex rounded-lg border border-space-600 p-0.5">
            {FILTERS.map((x) => (
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
        <Empty>Нет предупреждений в этой категории.</Empty>
      )}
    </div>
  )
}
