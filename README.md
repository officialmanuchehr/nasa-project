# StarTime+ · ORBIT AI

Прототип веб-платформы мониторинга здоровья астронавтов в длительных космических миссиях для **NASA Space Apps Challenge 2026** (задача *Create Health Monitoring Software for Astronauts on Space Missions*).

> ⚠️ Прототип, **не сертифицированное медицинское устройство**. Не ставит диагнозы и не назначает лечение. Все демонстрационные значения генерируются симулятором (`is_simulated = true`) и не являются данными астронавтов или NASA.

## Что умеет
- **Dashboard / Live Monitoring** — пульс, SpO₂, температура, давление, активность; графики с личной baseline.
- **Risk Detection** — прозрачный rule-based движок (`src/features/risk-detection/engine.ts`): сравнение с индивидуальной baseline по часу суток, проверка качества данных, сон, радиация, самоотчёт. У каждого предупреждения есть причина, доказательства, период, качество данных, правило и версия, а также следующий шаг. Дублей нет, предупреждения закрываются автоматически.
- **Sleep / Radiation / Reports / Notifications / Mission / Crew** — история, отчёты за день, неделю и месяц (печать в PDF).
- **ORBIT AI** — серверный endpoint `api/orbit/chat.ts`: проверка авторизации, контекст здоровья (по RLS), поиск по базе знаний из реальных страниц NASA (`supabase/seed_knowledge.sql`), ответы со ссылками на источники.
- **Симулятор** — сценарии: обычная динамика, пропуски, устаревший датчик, изменение тенденции; Live-режим.

## Стек
React + TypeScript + Vite, Tailwind CSS, React Router, Recharts, Lucide · Supabase (Auth, PostgreSQL + RLS, Realtime, pgvector) · Vercel Functions · AI API только на сервере.

## Запуск локально
```bash
npm install
cp .env.example .env.local   # заполнить VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY
npm run dev                  # UI (без ключей работает в демо-режиме)
npm test                     # тесты Risk Engine
npx vercel dev               # UI + /api (для ORBIT AI)
```

## База данных
1. `supabase/migrations/*.sql` — схема, RLS, роли, триггер профиля, поиск, демо-миссия.
2. `supabase/seed_knowledge.sql` — база знаний NASA (пересобрать: `node scripts/build-knowledge.mjs`).
3. Роль врача: `update profiles set role='medical_officer' where id='…'; update mission_members set access_level='medical' where profile_id='…';`

## Переменные окружения
| Где | Переменная |
|---|---|
| Frontend (публичные) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Только сервер Vercel | `AI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` |

Секреты не попадают в `VITE_*` и в репозиторий. `service_role` key приложению не нужен.
