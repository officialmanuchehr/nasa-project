// Двуязычный интерфейс (RU / EN) без внешних библиотек.
// • tr('русский', 'English') — возвращает строку на текущем языке. Работает и вне React
//   (Risk Engine, справочники), потому что язык хранится в модуле.
// • useLang() — подписка компонента на смену языка (перерисовка).
// Выбор сохраняется в localStorage; по умолчанию — язык браузера (ru → RU, иначе EN).
import { useSyncExternalStore } from 'react'

export type Lang = 'ru' | 'en'
const KEY = 'startime-lang'

function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'ru' || saved === 'en') return saved
  } catch {
    /* localStorage может быть недоступен */
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ru') ? 'ru' : 'en'
}

let current: Lang = initial()
const listeners = new Set<() => void>()
function applyDocument() {
  if (typeof document === 'undefined') return
  document.documentElement.lang = current
  document.title = current === 'en' ? 'StarTime+ — astronaut health monitoring' : 'StarTime+ — мониторинг здоровья астронавтов'
}
applyDocument()

export const getLang = () => current

export function setLang(lang: Lang) {
  if (lang === current) return
  current = lang
  try {
    localStorage.setItem(KEY, lang)
  } catch {
    /* ignore */
  }
  applyDocument()
  listeners.forEach((l) => l())
}

/** Строка на текущем языке. */
export const tr = (ru: string, en: string) => (current === 'en' ? en : ru)

/** Локаль для дат и чисел. */
export const locale = () => (current === 'en' ? 'en-US' : 'ru-RU')

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useLang() {
  const lang = useSyncExternalStore(subscribe, getLang, getLang)
  return { lang, setLang }
}
