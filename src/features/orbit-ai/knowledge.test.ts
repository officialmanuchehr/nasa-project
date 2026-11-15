import { describe, expect, it } from 'vitest'
import { search, queryTerms, KNOWLEDGE_STATS } from './knowledge'

describe('ORBIT knowledge search', () => {
  it('база знаний загружена', () => {
    expect(KNOWLEDGE_STATS.chunks).toBeGreaterThan(50)
  })
  it('русский вопрос → английские термины', () => {
    expect(queryTerms('Как микрогравитация влияет на кости?')).toEqual(expect.arrayContaining(['bone', 'microgravity']))
  })
  it.each([
    ['Какие риски несёт космическое излучение?', /radiation/i],
    ['Как микрогравитация влияет на кости и мышцы?', /bone|muscle/i],
    ['Почему изоляция опасна для экипажа?', /isolat|confine/i],
    ['Что происходит со зрением в космосе?', /vision|eye/i],
    ['How does microgravity affect bones and muscles?', /bone|muscle/i],
    ['What are the risks of space radiation?', /radiation/i],
  ])('%s', (q, re) => {
    const hits = search(q)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0].text).toMatch(re)
  })
  it('нерелевантный вопрос → ничего не найдено (не выдумываем)', () => {
    expect(search('рецепт борща')).toEqual([])
  })
})
