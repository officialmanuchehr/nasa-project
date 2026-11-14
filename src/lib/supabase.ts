// Supabase-клиент для браузера. Использует ТОЛЬКО публичный anon-ключ:
// доступ к данным ограничивают политики RLS в базе. service_role здесь никогда не используется.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Допускаем URL как с /rest/v1/ на конце, так и без — клиенту нужен базовый адрес проекта
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Supabase включается явно: VITE_USE_SUPABASE=true. Иначе — автономный демо-режим
// без регистрации (данные симулятора в браузере).
const enabled = import.meta.env.VITE_USE_SUPABASE === 'true'

/** null — автономный демо-режим. */
export const supabase: SupabaseClient | null = enabled && url && anonKey ? createClient(url, anonKey) : null
export const isSupabaseConfigured = supabase !== null
