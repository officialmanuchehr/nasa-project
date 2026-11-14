-- StarTime+ · Row Level Security, роли, триггеры, поиск, Realtime.
-- Роли:
--   astronaut       — только свои данные;
--   medical_officer — участники миссий, где у него access_level = 'medical';
--   admin           — конфигурация миссий; к медицинским данным доступа нет.

-- ───────────── Вспомогательные функции (security definer — без рекурсии RLS) ─────────────
create or replace function public.my_role()
returns text language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_mission_member(mid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.mission_members where mission_id = mid and profile_id = auth.uid())
$$;

create or replace function public.shares_mission(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.mission_members me
    join public.mission_members them on them.mission_id = me.mission_id
    where me.profile_id = auth.uid() and them.profile_id = target
  )
$$;

create or replace function public.can_view_astronaut(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select target = auth.uid()
    or (
      (select role from public.profiles where id = auth.uid()) = 'medical_officer'
      and exists (
        select 1 from public.mission_members me
        join public.mission_members them on them.mission_id = me.mission_id
        where me.profile_id = auth.uid() and me.access_level = 'medical' and them.profile_id = target
      )
    )
$$;

revoke execute on function public.my_role, public.is_mission_member, public.shares_mission, public.can_view_astronaut from anon;

-- ───────────── Включаем RLS везде ─────────────
alter table public.profiles enable row level security;
alter table public.missions enable row level security;
alter table public.mission_members enable row level security;
alter table public.health_metrics enable row level security;
alter table public.sleep_records enable row level security;
alter table public.radiation_records enable row level security;
alter table public.symptom_logs enable row level security;
alter table public.health_alerts enable row level security;
alter table public.risk_assessments enable row level security;
alter table public.metric_thresholds enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.nasa_sources enable row level security;
alter table public.nasa_source_chunks enable row level security;
alter table public.access_log enable row level security;

-- profiles: себя и участников своих миссий (только имя/роль). Менять можно только своё имя.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_mission(id) or public.my_role() = 'admin');
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated; -- роль сам себе не повысить

-- missions / mission_members: видят участники; управляет admin
create policy missions_select on public.missions for select to authenticated
  using (public.is_mission_member(id) or public.my_role() = 'admin');
create policy missions_admin on public.missions for all to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

create policy members_select on public.mission_members for select to authenticated
  using (public.is_mission_member(mission_id) or public.my_role() = 'admin');
create policy members_admin on public.mission_members for all to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- Медицинские таблицы: чтение — по can_view_astronaut; запись — только своих данных
-- в своей миссии; удаление — только своих СИМУЛИРОВАННЫХ данных (сброс симулятора).
do $$
declare t text;
begin
  foreach t in array array['health_metrics', 'sleep_records', 'radiation_records', 'symptom_logs'] loop
    execute format('create policy %1$s_select on public.%1$s for select to authenticated using (public.can_view_astronaut(astronaut_id))', t);
    execute format('create policy %1$s_insert on public.%1$s for insert to authenticated with check (astronaut_id = auth.uid() and public.is_mission_member(mission_id))', t);
    execute format('create policy %1$s_delete on public.%1$s for delete to authenticated using (astronaut_id = auth.uid() and is_simulated)', t);
  end loop;
end $$;

-- Предупреждения: врач может подтверждать ознакомление; астронавт — свои
create policy alerts_select on public.health_alerts for select to authenticated using (public.can_view_astronaut(astronaut_id));
create policy alerts_insert on public.health_alerts for insert to authenticated
  with check (astronaut_id = auth.uid() and public.is_mission_member(mission_id));
create policy alerts_update on public.health_alerts for update to authenticated
  using (public.can_view_astronaut(astronaut_id)) with check (public.can_view_astronaut(astronaut_id));
create policy alerts_delete on public.health_alerts for delete to authenticated using (astronaut_id = auth.uid());

create policy assessments_select on public.risk_assessments for select to authenticated using (public.can_view_astronaut(astronaut_id));
create policy assessments_insert on public.risk_assessments for insert to authenticated
  with check (astronaut_id = auth.uid() and public.is_mission_member(mission_id));

create policy thresholds_select on public.metric_thresholds for select to authenticated using (true);

-- ORBIT AI: только свои диалоги
create policy conv_all on public.ai_conversations for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy msg_select on public.ai_messages for select to authenticated
  using (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.profile_id = auth.uid()));
create policy msg_insert on public.ai_messages for insert to authenticated
  with check (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.profile_id = auth.uid()));

-- База знаний: читают все вошедшие; пишет только service role (через SQL / миграции)
create policy sources_select on public.nasa_sources for select to authenticated using (true);
create policy chunks_select on public.nasa_source_chunks for select to authenticated using (true);

-- Журнал доступа: пишет сам пользователь, читает admin
create policy log_insert on public.access_log for insert to authenticated with check (actor_id = auth.uid());
create policy log_select on public.access_log for select to authenticated using (public.my_role() = 'admin');

-- ───────────── Новый пользователь → профиль (+ демо-миссия) ─────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare demo uuid;
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)), 'astronaut');
  select id into demo from public.missions where is_demo order by created_at limit 1;
  if demo is not null then
    insert into public.mission_members (mission_id, profile_id, mission_role) values (demo, new.id, 'Бортинженер');
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────── Поиск по базе знаний NASA (полнотекстовый) ─────────────
create or replace function public.search_nasa_chunks(query text, match_count int default 6)
returns table (source_id uuid, title text, source_url text, publisher text, content text, rank real)
language sql stable set search_path = '' as $$
  select s.id, s.title, s.source_url, s.publisher, c.content,
         ts_rank(c.fts, websearch_to_tsquery('english', query)) as rank
  from public.nasa_source_chunks c
  join public.nasa_sources s on s.id = c.source_id
  where c.fts @@ websearch_to_tsquery('english', query)
  order by rank desc
  limit least(match_count, 10)
$$;
revoke execute on function public.search_nasa_chunks from anon;

-- ───────────── Realtime ─────────────
alter publication supabase_realtime add table public.health_metrics, public.health_alerts;

-- ───────────── Демо-миссия (вымышленная, помечена как демо) ─────────────
insert into public.missions (id, name, mission_code, start_date, end_date, status, environment_json, is_demo)
values (
  '00000000-0000-0000-0000-000000000001', 'Deep Horizon (демо)', 'STM-01',
  now() - interval '21 days', now() + interval '160 days', 'active',
  '{"Тип": "Длительная миссия (симуляция)", "Гравитация": "Микрогравитация", "Экипаж": "4 человека", "Связь": "Задержка (симуляция)"}',
  true
) on conflict do nothing;
