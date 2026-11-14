// Сборка базы знаний ORBIT AI из реальных публичных страниц NASA.
// Скачивает страницы, извлекает текст статьи, режет на фрагменты (~1000 символов)
// и пишет SQL-файл supabase/seed_knowledge.sql (запускается в Supabase SQL Editor
// или через `supabase db push`). Тексты не переписываются и не выдумываются.
//
// Запуск: node scripts/build-knowledge.mjs
import { writeFileSync } from 'node:fs'

const SOURCES = [
  'https://www.nasa.gov/hrp/hazards/',
  'https://www.nasa.gov/hrp/hazard-space-radiation/',
  'https://www.nasa.gov/hrp/hazard-isolation-and-confinement/',
  'https://www.nasa.gov/hrp/hazard-distance-from-earth/',
  'https://www.nasa.gov/hrp/hazard-gravity-fields/',
  'https://www.nasa.gov/hrp/hazard-hostile-closed-environments/',
  'https://www.nasa.gov/hrp/radiation/',
  'https://www.nasa.gov/hrp/risks/',
  'https://www.nasa.gov/hrp/',
  'https://www.nasa.gov/humans-in-space/the-human-body-in-space/',
  'https://www.nasa.gov/humans-in-space/space-radiation-is-risky-business-for-the-human-body/',
  'https://www.nasa.gov/missions/analog-field-testing/why-space-radiation-matters/',
]

const decode = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&rsquo;|&lsquo;|&#8217;|&#8216;/g, "'")
    .replace(/&ldquo;|&rdquo;|&#8220;|&#8221;/g, '"')
    .replace(/&ndash;|&#8211;/g, '–')
    .replace(/&mdash;|&#8212;/g, '—')
    .replace(/&hellip;|&#8230;/g, '…')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))

function extract(html) {
  const title = decode(
    (html.match(/<meta property="og:title" content="([^"]+)"/) || html.match(/<title>([^<]+)<\/title>/) || [, 'NASA'])[1],
  )
    .replace(/\s*[-|–]\s*NASA.*$/i, '')
    .trim()
  const published = (html.match(/"datePublished":"([0-9-]{10})/) || html.match(/article:published_time" content="([0-9-]{10})/) || [])[1] ?? null
  let body = html
  const main = html.match(/<main[\s\S]*?<\/main>/i)
  if (main) body = main[0]
  body = body.replace(/<(script|style|noscript|svg|nav|footer|form|figure)[\s\S]*?<\/\1>/gi, ' ')
  const blocks = []
  const re = /<(p|h2|h3|h4|li)[^>]*>([\s\S]*?)<\/\1>/gi
  let m
  while ((m = re.exec(body))) {
    const text = decode(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
    if (text.length < 25) continue
    if (/^(share|read more|related|follow|explore|credit|image credit)/i.test(text)) continue
    blocks.push(m[1].startsWith('h') ? `## ${text}` : text)
  }
  // убираем дубли блоков (меню/повторы)
  const seen = new Set()
  return { title, published, blocks: blocks.filter((b) => (seen.has(b) ? false : (seen.add(b), true))) }
}

function chunk(blocks, max = 1100) {
  const out = []
  let cur = ''
  for (const b of blocks) {
    if (cur && cur.length + b.length + 1 > max) {
      out.push(cur.trim())
      cur = ''
    }
    cur += b + '\n'
  }
  if (cur.trim().length > 80) out.push(cur.trim())
  return out
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`

const sql = [
  '-- База знаний ORBIT AI: фрагменты публичных страниц NASA.',
  `-- Сгенерировано scripts/build-knowledge.mjs ${new Date().toISOString().slice(0, 10)}. Повторный запуск безопасен.`,
  'begin;',
]
let total = 0
const json = [] // та же база для поиска в браузере (src/data/nasa-knowledge.json)
for (const url of SOURCES) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (StarTime+ knowledge builder)' }, redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const { title, published, blocks } = extract(await res.text())
    const chunks = chunk(blocks)
    if (!chunks.length) throw new Error('нет текста')
    const finalUrl = res.url
    const publisher = finalUrl.includes('humanresearchroadmap') ? 'NASA Human Research Roadmap' : finalUrl.includes('/hrp/') ? 'NASA Human Research Program' : 'NASA'
    sql.push(`delete from public.nasa_sources where source_url = ${q(finalUrl)};`)
    sql.push(
      `with s as (insert into public.nasa_sources (title, source_url, publisher, published_at, document_type, metadata_json) values (${q(title)}, ${q(finalUrl)}, ${q(publisher)}, ${published ? q(published) : 'null'}, 'web_page', ${q(JSON.stringify({ fetched_at: new Date().toISOString(), chunks: chunks.length }))}) returning id)`,
    )
    sql.push(`insert into public.nasa_source_chunks (source_id, chunk_index, content) select s.id, v.i, v.c from s, (values ${chunks.map((c, i) => `(${i}, ${q(c)})`).join(', ')}) as v(i, c);`)
    total += chunks.length
    json.push({ title, url: finalUrl, publisher, published, chunks })
    console.log(`✓ ${title} — ${chunks.length} фрагм. (${finalUrl})`)
  } catch (e) {
    console.log(`✗ ${url}: ${e.message}`)
  }
}
sql.push('commit;')
writeFileSync(new URL('../supabase/seed_knowledge.sql', import.meta.url), sql.join('\n') + '\n')
writeFileSync(new URL('../src/data/nasa-knowledge.json', import.meta.url), JSON.stringify({ built_at: new Date().toISOString(), sources: json }))
console.log(`Готово: ${total} фрагментов → supabase/seed_knowledge.sql`)
