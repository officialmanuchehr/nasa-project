-- StarTime+ · схема базы данных (Supabase PostgreSQL)
-- Таблицы, связи, ограничения и индексы. Политики RLS — в следующей миграции.

create extension if not exists vector with schema extensions; -- pgvector (для будущего семантического поиска)

-- ───────────── Профили и миссии ─────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  role text not null default 'astronaut' check (role in ('astronaut', 'medical_officer', 'admin')),
  created_at timestamptz not null default now()
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mission_code text not null unique,
  start_date timestamptz not null,
  end_date timestamptz,
  status text not null default 'planned' check (status in ('planned', 'active', 'completed')),
  environment_json jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  check (end_date is null or end_date > start_date)
);

create table public.mission_members (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  mission_role text not null default 'Участник',
  -- self: видит только себя; medical: (для врача) видит участников миссии
  access_level text not null default 'self' check (access_level in ('self', 'medical')),
  created_at timestamptz not null default now(),
  unique (mission_id, profile_id)
);
create index on public.mission_members (profile_id);

-- ───────────── Медицинские данные ─────────────
create table public.health_metrics (
  id uuid primary key default gen_random_uuid(),
  astronaut_id uuid not null references public.profiles (id) on delete cascade,
  mission_id uuid not null references public.missions (id) on delete cascade,
  metric_type text not null check (metric_type in ('heart_rate', 'spo2', 'body_temp', 'systolic_bp', 'diastolic_bp', 'activity')),
  value double precision, -- NULL = измерения нет (не подставляем выдуманные значения)
  unit text not null,
  recorded_at timestamptz not null,
  data_source text not null check (data_source in ('simulator', 'sensor', 'import', 'manual')),
  is_simulated boolean not null default false,
  quality_status text not null default 'ok' check (quality_status in ('ok', 'missing', 'stale', 'suspect')),
  created_at timestamptz not null default now(),
  check (value is not null or quality_status <> 'ok'),
  check (data_source <> 'simulator' or is_simulated) -- симуляция всегда помечена
);
create index on public.health_metrics (astronaut_id, recorded_at);
create index on public.health_metrics (astronaut_id, metric_type, recorded_at);

create table public.sleep_records (
  id uuid primary key default gen_random_uuid(),
  astronaut_id uuid not null references public.profiles (id) on delete cascade,
  mission_id uuid not null references public.missions (id) on delete cascade,
  sleep_start timestamptz not null,
  sleep_end timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0),
  quality_data jsonb,
  data_source text not null check (data_source in ('simulator', 'sensor', 'import', 'manual')),
  is_simulated boolean not null default false,
  created_at timestamptz not null default now(),
  check (sleep_end > sleep_start),
  check (data_source <> 'simulator' or is_simulated)
);
create index on public.sleep_records (astronaut_id, sleep_start);

create table public.radiation_records (
  id uuid primary key default gen_random_uuid(),
  astronaut_id uuid not null references public.profiles (id) on delete cascade,
  mission_id uuid not null references public.missions (id) on delete cascade,
  measured_value double precision not null check (measured_value >= 0),
  unit text not null,
  recorded_at timestamptz not null,
  instrument_source text not null,
  is_simulated boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.radiation_records (astronaut_id, recorded_at);

create table public.symptom_logs (
  id uuid primary key default gen_random_uuid(),
  astronaut_id uuid not null references public.profiles (id) on delete cascade,
  mission_id uuid not null references public.missions (id) on delete cascade,
  symptom_category text not null check (char_length(symptom_category) <= 60),
  self_report text not null check (char_length(self_report) <= 500),
  intensity integer not null check (intensity between 0 and 10),
  recorded_at timestamptz not null default now(),
  is_simulated boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.symptom_logs (astronaut_id, recorded_at);

-- ───────────── Предупреждения и оценки ─────────────
create table public.health_alerts (
  id uuid primary key default gen_random_uuid(),
  astronaut_id uuid not null references public.profiles (id) on delete cascade,
  mission_id uuid not null references public.missions (id) on delete cascade,
  category text not null check (category in ('cardiovascular', 'respiratory', 'thermoregulation', 'sleep', 'radiation', 'behavioral', 'data_quality')),
  severity text not null check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  title text not null,
  description text not null,
  next_step text not null,
  data_quality text not null,
  rule_id text not null,
  ruleset_version text not null,
  dedup_key text not null,
  evidence_json jsonb not null default '{}',
  period_start timestamptz not null,
  period_end timestamptz not null,
  status text not null default 'active' check (status in ('active', 'acknowledged', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index on public.health_alerts (astronaut_id, created_at desc);
-- Одно открытое предупреждение на одно продолжающееся событие (без дублей)
create unique index health_alerts_open_dedup on public.health_alerts (astronaut_id, dedup_key) where status <> 'resolved';

create table public.risk_assessments (
  id uuid primary key default gen_random_uuid(),
  astronaut_id uuid not null references public.profiles (id) on delete cascade,
  mission_id uuid not null references public.missions (id) on delete cascade,
  category text not null,
  severity text check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  explanation text not null,
  evidence_json jsonb not null default '{}',
  assessed_at timestamptz not null default now(),
  ruleset_version text not null
);
create index on public.risk_assessments (astronaut_id, assessed_at desc);

create table public.metric_thresholds (
  id uuid primary key default gen_random_uuid(),
  metric_type text not null,
  population_or_profile_scope text not null default 'profile',
  lower_bound double precision,
  upper_bound double precision,
  unit text not null,
  source_reference text,
  is_demo boolean not null default true,
  effective_from timestamptz not null default now()
);

-- ───────────── ORBIT AI ─────────────
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Новый диалог',
  created_at timestamptz not null default now()
);
create index on public.ai_conversations (profile_id, created_at desc);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources_json jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index on public.ai_messages (conversation_id, created_at);

-- База знаний NASA: документы и фрагменты. Полнотекстовый поиск (tsvector);
-- колонка embedding зарезервирована для семантического поиска pgvector.
create table public.nasa_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_url text not null unique,
  publisher text not null,
  published_at date,
  document_type text not null default 'web_page',
  storage_path text,
  metadata_json jsonb not null default '{}',
  created_at timestamptz not null default now() -- дата загрузки
);

create table public.nasa_source_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.nasa_sources (id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  fts tsvector generated always as (to_tsvector('english', content)) stored,
  embedding extensions.vector(1024),
  unique (source_id, chunk_index)
);
create index on public.nasa_source_chunks using gin (fts);

-- Журнал доступа к чувствительным данным (например, использование данных здоровья в AI)
create table public.access_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  astronaut_id uuid references public.profiles (id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);
