// ORBIT AI: чат с AI-помощником. Запросы идут на серверный endpoint /api/orbit/chat
// (ключ AI хранится только на сервере). Ответы опираются на найденные фрагменты
// документов NASA из базы знаний и показывают источники.
import { useEffect, useRef, useState } from 'react'
import { Bot, ExternalLink, Send, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useData } from '../features/health/DataProvider'
import { Card, PageHeader } from '../components/ui'
import type { OrbitSource } from '../types'

interface Msg {
  role: 'user' | 'assistant'
  content: string
  sources?: OrbitSource[]
}

const SUGGESTIONS = [
  'Как микрогравитация влияет на кости и мышцы?',
  'Какие риски несёт космическое излучение?',
  'Почему в длительной миссии важен сон?',
  'Объясни мои текущие предупреждения',
]

export default function OrbitAIPage() {
  const { mode } = useData()
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [includeHealth, setIncludeHealth] = useState(true)
  const [pending, setPending] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, pending])

  async function send(text: string) {
    const q = text.trim()
    if (!q || pending) return
    setInput('')
    const history = [...messages, { role: 'user' as const, content: q }]
    setMessages(history)
    setPending(true)
    try {
      const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } }
      const res = await fetch('/api/orbit/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}` },
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })), conversationId, includeHealth }),
      })
      const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
      setConversationId(body.conversationId ?? conversationId)
      setMessages((m) => [...m, { role: 'assistant', content: body.answer, sources: body.sources }])
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: `⚠️ AI сейчас недоступен: ${(e as Error).message}` }])
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col">
      <PageHeader title="ORBIT AI" subtitle="Научный помощник: объясняет факторы космического полёта с опорой на документы NASA" />
      {mode === 'demo' && (
        <p className="mb-3 rounded-lg border border-medium/30 bg-medium/5 px-3 py-2 text-xs text-ink-dim">
          В локальном демо-режиме AI недоступен: нужен вход через Supabase и серверный endpoint (после деплоя на Vercel или через <code>vercel dev</code>).
        </p>
      )}
      <Card className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1" aria-live="polite">
          {!messages.length && (
            <div className="grid h-full place-items-center text-center">
              <div>
                <Bot size={40} className="mx-auto text-accent" />
                <p className="mt-3 text-sm text-ink-dim">Задайте вопрос о влиянии космического полёта на здоровье.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="rounded-full border border-space-600 px-3 py-1.5 text-xs text-ink-dim hover:bg-space-800 hover:text-ink">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${m.role === 'user' ? 'bg-space-700' : 'bg-accent/15 text-accent'}`}>
                {m.role === 'user' ? <User size={15} /> : <Bot size={15} />}
              </div>
              <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${m.role === 'user' ? 'bg-accent/12 text-ink' : 'bg-space-850 text-ink'}`}>
                <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-3 border-t border-space-700 pt-2">
                    <div className="label-caps mb-1">Источники</div>
                    <ol className="space-y-1">
                      {m.sources.map((s, j) => (
                        <li key={s.url + j} className="text-xs">
                          <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                            [{j + 1}] {s.title} <ExternalLink size={11} />
                          </a>
                          <span className="text-ink-mute"> · {s.publisher}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {m.role === 'assistant' && m.sources && m.sources.length === 0 && (
                  <p className="mt-2 text-xs text-ink-mute">Подходящих источников в базе знаний не найдено.</p>
                )}
              </div>
            </div>
          ))}
          {pending && <div className="text-sm text-ink-mute">ORBIT AI думает…</div>}
          <div ref={endRef} />
        </div>
        <form
          className="mt-3 flex flex-col gap-2 border-t border-space-700 pt-3"
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
        >
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={2000}
              placeholder="Спросите ORBIT AI…"
              className="min-w-0 flex-1 rounded-lg border border-space-600 bg-space-950 px-3 py-2 text-sm"
              aria-label="Вопрос"
            />
            <button type="submit" disabled={pending || !input.trim()} className="grid w-11 place-items-center rounded-lg bg-accent text-space-950 disabled:opacity-40" aria-label="Отправить">
              <Send size={16} />
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs text-ink-mute">
            <input type="checkbox" checked={includeHealth} onChange={(e) => setIncludeHealth(e.target.checked)} />
            Учитывать мои показатели и предупреждения (только ваши данные, по правам доступа)
          </label>
          <p className="text-[11px] text-ink-mute">ORBIT AI не ставит диагнозы и не назначает лечение. При серьёзной проблеме обратитесь к медицинскому специалисту миссии.</p>
        </form>
      </Card>
    </div>
  )
}
