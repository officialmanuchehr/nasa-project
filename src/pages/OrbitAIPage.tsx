// ORBIT AI · режим без внешнего AI API.
// • Научные вопросы → поиск по базе знаний из реальных страниц NASA прямо в браузере;
//   показываются оригинальные фрагменты (на английском) с номерами и ссылками на источники.
// • «Объясни мои предупреждения» → объяснение по данным Risk Engine (правило, причина, шаг).
// Ничего не выдумывается: если подходящего фрагмента нет — так и сообщается.
// (Серверный endpoint с AI — api/orbit/chat.ts — подключается позже, когда будет ключ.)
import { useEffect, useRef, useState } from 'react'
import { BookOpen, Bot, ExternalLink, Send, User } from 'lucide-react'
import { useData } from '../features/health/DataProvider'
import { Card, PageHeader } from '../components/ui'
import { excerpt, KNOWLEDGE_STATS, search } from '../features/orbit-ai/knowledge'
import { CATEGORY_LABELS } from '../features/health/metrics'
import type { HealthAlert, OrbitSource } from '../types'
import type { CategoryAssessment } from '../features/risk-detection/engine'
import { tr } from '../lib/i18n'

interface Quote {
  text: string
  n: number
}
interface Msg {
  role: 'user' | 'assistant'
  content: string
  quotes?: Quote[]
  sources?: OrbitSource[]
}

const SUGGESTIONS = () => [
  tr('Как микрогравитация влияет на кости и мышцы?', 'How does microgravity affect bones and muscles?'),
  tr('Какие риски несёт космическое излучение?', 'What are the risks of space radiation?'),
  tr('Почему изоляция опасна для экипажа?', 'Why is isolation dangerous for the crew?'),
  tr('Что происходит со зрением в космосе?', 'What happens to vision in space?'),
  tr('Объясни мои текущие предупреждения', 'Explain my current alerts'),
]

const ALERT_INTENT = /предупрежд|мои показат|моё состоян|мое состоян|мои данные|алерт|alert|warning|my (vitals|data|status|readings)|риск.* у меня/i
const CATEGORY_QUERY: Record<string, string> = {
  cardiovascular: 'heart cardiovascular blood',
  respiratory: 'air carbon dioxide environment',
  thermoregulation: 'environment habitat',
  sleep: 'sleep isolation',
  radiation: 'space radiation',
  behavioral: 'behavioral isolation confinement',
}

function answerKnowledge(question: string): Msg {
  const hits = search(question, 3)
  if (!hits.length) {
    return {
      role: 'assistant',
      content:
        tr(
          'В базе знаний NASA подходящих материалов по этому вопросу не найдено. Я не буду отвечать без подтверждающего источника. Попробуйте спросить о радиации, гравитации, костях и мышцах, изоляции, сне, зрении, удалённости от Земли или среде обитания.',
          'No matching material was found in the NASA knowledge base. I won’t answer without a supporting source. Try asking about radiation, gravity, bones and muscles, isolation, sleep, vision, distance from Earth or the habitat environment.',
        ),
      sources: [],
    }
  }
  const sources: OrbitSource[] = []
  const quotes = hits.map((h) => {
    let n = sources.findIndex((s) => s.url === h.source.url) + 1
    if (!n) {
      sources.push(h.source)
      n = sources.length
    }
    return { text: excerpt(h.text), n }
  })
  return {
    role: 'assistant',
    content: tr(
      `Нашёл в официальных материалах NASA ${quotes.length} ${quotes.length === 1 ? 'релевантный фрагмент' : 'релевантных фрагмента'} (цитаты на языке оригинала):`,
      `Found ${quotes.length} relevant ${quotes.length === 1 ? 'passage' : 'passages'} in official NASA materials:`,
    ),
    quotes,
    sources,
  }
}

function answerAlerts(alerts: HealthAlert[], assessments: CategoryAssessment[]): Msg {
  const open = alerts.filter((a) => a.status !== 'resolved')
  if (!open.length) {
    const ok = assessments.filter((a) => a.status === 'ok').map((a) => CATEGORY_LABELS[a.category])
    return {
      role: 'assistant',
      content: tr(
        `Сейчас открытых предупреждений нет.${ok.length ? ` В пределах вашей личной baseline: ${ok.join(', ')}.` : ''}\n\nЧтобы увидеть, как работает обнаружение изменений, откройте «Симулятор» → «Изменение тенденции».`,
        `There are no open alerts right now.${ok.length ? ` Within your personal baseline: ${ok.join(', ')}.` : ''}\n\nTo see change detection in action, open “Simulator” → “Trend change”.`,
      ),
    }
  }
  const lines = open.map(
    (a, i) =>
      `${i + 1}. [${a.severity}] ${a.title}\n   ${tr('Почему', 'Why')}: ${a.description}\n   ${tr('Правило', 'Rule')}: ${a.rule_id} (${a.ruleset_version}) · ${tr('Качество данных', 'Data quality')}: ${a.data_quality}\n   ${tr('Следующий шаг', 'Next step')}: ${a.next_step}`,
  )
  // Научный контекст по категории самого приоритетного предупреждения
  const top = [...open].sort((x, y) => 'LOW MEDIUM HIGH CRITICAL'.indexOf(y.severity) - 'LOW MEDIUM HIGH CRITICAL'.indexOf(x.severity))[0]
  const ctx = CATEGORY_QUERY[top.category] ? search(CATEGORY_QUERY[top.category], 1) : []
  return {
    role: 'assistant',
    content:
      tr(
        `Открытых предупреждений: ${open.length}. Это наблюдения относительно вашей личной baseline, а не диагнозы.`,
        `Open alerts: ${open.length}. These are observations relative to your personal baseline, not diagnoses.`,
      ) +
      `\n\n${lines.join('\n\n')}\n\n` +
      tr(
        'При серьёзных изменениях обратитесь к медицинскому специалисту миссии и следуйте утверждённому протоколу.',
        'For serious changes, contact the mission medical officer and follow the approved protocol.',
      ) +
      (ctx.length ? tr(`\n\nНаучный контекст по категории «${CATEGORY_LABELS[top.category]}»:`, `\n\nScientific context for “${CATEGORY_LABELS[top.category]}”:`) : ''),
    quotes: ctx.map((h) => ({ text: excerpt(h.text, 420), n: 1 })),
    sources: ctx.map((h) => h.source),
  }
}

export default function OrbitAIPage() {
  const { alerts, engine } = useData()
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, pending])

  function send(text: string) {
    const q = text.trim()
    if (!q || pending) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: q }])
    setPending(true)
    // небольшая пауза, чтобы ответ не появлялся «мгновенно-рывком»
    setTimeout(() => {
      const reply = ALERT_INTENT.test(q) ? answerAlerts(alerts, engine?.assessments ?? []) : answerKnowledge(q)
      setMessages((m) => [...m, reply])
      setPending(false)
    }, 350)
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] min-h-[520px] flex-col">
      <PageHeader title="ORBIT AI" subtitle={tr('Научный помощник: факторы космического полёта по материалам NASA и объяснение ваших предупреждений', 'Science assistant: spaceflight hazards from NASA materials and an explanation of your alerts')} />
      <p className="mb-3 flex items-start gap-2 rounded-lg border border-accent/25 bg-accent/5 px-3 py-2 text-xs text-ink-dim">
        <BookOpen size={15} className="mt-0.5 shrink-0 text-accent" />
        <span>
          {tr(
            `Режим базы знаний: ответы — это оригинальные фрагменты ${KNOWLEDGE_STATS.sources} официальных страниц NASA (${KNOWLEDGE_STATS.chunks} фрагментов) со ссылками на источники. Генеративный AI будет подключён на следующем этапе.`,
            `Knowledge-base mode: answers are original passages from ${KNOWLEDGE_STATS.sources} official NASA pages (${KNOWLEDGE_STATS.chunks} passages) with source links. Generative AI will be connected in the next stage.`,
          )}
        </span>
      </p>
      <Card className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1" aria-live="polite">
          {!messages.length && (
            <div className="grid h-full place-items-center text-center">
              <div>
                <Bot size={40} className="mx-auto text-accent" />
                <p className="mt-3 text-sm text-ink-dim">{tr('Задайте вопрос о влиянии космического полёта на здоровье.', 'Ask a question about how spaceflight affects health.')}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS().map((s) => (
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
              <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${m.role === 'user' ? 'bg-accent/12' : 'bg-space-850'}`}>
                <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                {m.quotes && m.quotes.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {m.quotes.map((q, j) => (
                      <blockquote key={j} lang="en" className="border-l-2 border-accent/60 pl-3 text-[13px] italic text-ink-dim">
                        {q.text} <span className="not-italic font-mono text-accent">[{q.n}]</span>
                      </blockquote>
                    ))}
                  </div>
                )}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-3 border-t border-space-700 pt-2">
                    <div className="label-caps mb-1">{tr('Источники', 'Sources')}</div>
                    <ol className="space-y-1">
                      {m.sources.map((s, j) => (
                        <li key={s.url} className="text-xs">
                          <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                            [{j + 1}] {s.title} <ExternalLink size={11} />
                          </a>
                          <span className="text-ink-mute"> · {s.publisher}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>
          ))}
          {pending && <div className="text-sm text-ink-mute">{tr('ORBIT AI ищет в базе знаний…', 'ORBIT AI is searching the knowledge base…')}</div>}
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
              maxLength={500}
              placeholder={tr('Спросите ORBIT AI…', 'Ask ORBIT AI…')}
              className="min-w-0 flex-1 rounded-lg border border-space-600 bg-space-950 px-3 py-2 text-sm"
              aria-label={tr('Вопрос', 'Question')}
            />
            <button type="submit" disabled={pending || !input.trim()} className="grid w-11 place-items-center rounded-lg bg-accent text-space-950 disabled:opacity-40" aria-label={tr('Отправить', 'Send')}>
              <Send size={16} />
            </button>
          </div>
          <p className="text-[11px] text-ink-mute">{tr('ORBIT AI не ставит диагнозы и не назначает лечение. При серьёзной проблеме обратитесь к медицинскому специалисту миссии.', 'ORBIT AI does not diagnose or prescribe treatment. For a serious problem, contact the mission medical officer.')}</p>
        </form>
      </Card>
    </div>
  )
}
