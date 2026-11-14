// ORBIT AI · режим без внешнего AI API.
// Поиск по базе знаний из реальных страниц NASA (src/data/nasa-knowledge.json) прямо в браузере:
// русский вопрос → английские ключевые слова (словарь) → ранжирование BM25 → цитаты с источниками.
// Ничего не генерируется и не перефразируется: показываются оригинальные фрагменты NASA.
import kb from '../../data/nasa-knowledge.json'
import type { OrbitSource } from '../../types'

interface Chunk {
  text: string
  tokens: string[]
  source: OrbitSource
}

// Русские основы слов → английские термины базы знаний
const RU_EN: [RegExp, string[]][] = [
  [/кост|скелет|перелом/, ['bone', 'bones', 'skeletal', 'fracture']],
  [/мышц|мускул/, ['muscle', 'muscles']],
  [/радиац|излучен|облучен|доз|солнечн.*вспыш|космич.*луч/, ['radiation', 'cosmic', 'rays', 'solar', 'particle', 'dose']],
  [/рак|онколог|опухол/, ['cancer']],
  [/сон|сна|спать|сплю|бессонн|усталост|утомл/, ['sleep', 'fatigue', 'circadian']],
  [/изоляц|одиноч|замкнут|огранич.*простр|конфайн/, ['isolation', 'confinement', 'isolated', 'confined']],
  [/психол|поведен|стресс|тревож|настроен|депресс|конфликт|команд/, ['behavioral', 'behavior', 'stress', 'psychological', 'team', 'crew']],
  [/гравитац|невесом|микрограв|притяжен/, ['gravity', 'microgravity', 'weightlessness']],
  [/сердц|сердеч|кардио|пульс|давлен|сосуд/, ['heart', 'cardiovascular', 'blood', 'pressure']],
  [/кров/, ['blood']],
  [/жидкост|отек|отёк/, ['fluid', 'fluids', 'shift']],
  [/зрен|глаз|видет/, ['vision', 'eye', 'eyes']],
  [/мозг|нерв|когнит|памят/, ['brain', 'nervous', 'cognitive']],
  [/иммун|инфекц|микроб|бактер/, ['immune', 'microbes', 'bacteria']],
  [/земл|расстоян|удален|удалён|связ|автоном|эвакуац/, ['distance', 'earth', 'communication', 'autonomous']],
  [/сред|воздух|углекисл|шум|освещ|модул|станц/, ['environment', 'air', 'carbon', 'dioxide', 'habitat', 'station']],
  [/питан|еда|пищ|витамин/, ['food', 'nutrition']],
  [/упражн|трениров|физ.*нагруз|спорт/, ['exercise']],
  [/марс/, ['mars']],
  [/лун/, ['moon', 'lunar']],
  [/мкс|международн.*косм/, ['station', 'iss']],
  [/вестибул|равновес|ориентац|укачив|тошнот/, ['balance', 'orientation', 'motion', 'sickness', 'vestibular']],
  [/здоров|организм|тело/, ['body', 'health']],
  [/риск|опасн|угроз|фактор/, ['hazards', 'risks', 'risk']],
  [/исследован|nasa|наса/, ['research', 'nasa']],
]

const STOP = new Set(
  'the a an and or of to in on for with by as at is are was were be been it its this that these those from can will may into than then their they them our we you your how what why which who when where also more most such not but have has had do does'.split(' '),
)

function stem(w: string) {
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y'
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1)
  return w
}
function tokenize(s: string) {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map(stem)
}

// ── индекс ──
const CHUNKS: Chunk[] = (kb as { sources: { title: string; url: string; publisher: string; chunks: string[] }[] }).sources.flatMap((s) =>
  s.chunks.map((text) => ({
    text,
    tokens: tokenize(`${s.title} ${text}`),
    source: { title: s.title, url: s.url, publisher: s.publisher },
  })),
)
const N = CHUNKS.length
const AVG = CHUNKS.reduce((a, c) => a + c.tokens.length, 0) / Math.max(N, 1)
const DF = new Map<string, number>()
for (const c of CHUNKS) for (const t of new Set(c.tokens)) DF.set(t, (DF.get(t) ?? 0) + 1)

export const KNOWLEDGE_STATS = { chunks: N, sources: new Set(CHUNKS.map((c) => c.source.url)).size }

/** Русский/английский вопрос → английские поисковые термины. */
export function queryTerms(question: string): string[] {
  const q = question.toLowerCase()
  const terms = new Set<string>(tokenize(q)) // английские слова из вопроса
  for (const [re, en] of RU_EN) if (re.test(q)) en.forEach((t) => terms.add(stem(t)))
  return [...terms]
}

export interface Hit {
  text: string
  source: OrbitSource
  score: number
}

/** BM25-поиск. Возвращает лучшие фрагменты (не больше 2 на один документ). */
export function search(question: string, limit = 3): Hit[] {
  const terms = queryTerms(question)
  if (!terms.length) return []
  const k1 = 1.4
  const b = 0.75
  const scored = CHUNKS.map((c) => {
    let score = 0
    for (const t of terms) {
      const df = DF.get(t)
      if (!df) continue
      const tf = c.tokens.filter((x) => x === t).length
      if (!tf) continue
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5))
      score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * c.tokens.length) / AVG)))
    }
    return { text: c.text, source: c.source, score }
  })
    .filter((h) => h.score > 1.2)
    .sort((a, b) => b.score - a.score)
  const perSource = new Map<string, number>()
  const out: Hit[] = []
  for (const h of scored) {
    const n = perSource.get(h.source.url) ?? 0
    if (n >= 2) continue
    perSource.set(h.source.url, n + 1)
    out.push(h)
    if (out.length >= limit) break
  }
  return out
}

/** Обрезать фрагмент по границе предложения. */
export function excerpt(text: string, max = 520) {
  const clean = text.replace(/^## /gm, '').replace(/\n+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
  return (end > 200 ? cut.slice(0, end + 1) : cut) + ' …'
}
