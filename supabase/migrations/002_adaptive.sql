-- =====================================================================
-- Mishi Study - 002: ciclo adaptativo
-- Ejecutar UNA sola vez, DESPUÉS de 001_schema.sql y ANTES de publicar
-- la versión 2 de la Edge Function (index.ts).
-- Supabase > SQL Editor > New query > pegar todo > Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Columnas nuevas en tablas existentes
-- ---------------------------------------------------------------------
-- Peso de la materia (1 = normal, 3 = muy importante, p. ej. examen cercano)
alter table public.subjects
  add column weight smallint not null default 1 check (weight between 1 and 3);

-- Lista de temas detectados en el material (arreglo de textos)
alter table public.materials
  add column topics jsonb;

-- Tipo de examen y temas en los que se enfocó
alter table public.exams
  add column kind text not null default 'practice'
    check (kind in ('diagnostic', 'practice', 'reevaluation')),
  add column focus_topics jsonb;

-- Para saber cuáles fueron las respuestas falladas más recientes
alter table public.attempt_answers
  add column created_at timestamptz not null default now();

-- Estado de cada tema dentro del ciclo de refuerzo
alter table public.topic_progress
  add column status text not null default 'pending'
    check (status in ('pending', 'reinforcing', 'approved')),
  add column failed_rounds smallint not null default 0,
  add column last_evaluated_at timestamptz;

-- ---------------------------------------------------------------------
-- 2. LECCIONES de refuerzo (historial, para no repetir la misma explicación)
-- ---------------------------------------------------------------------
create table public.lessons (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  subject_id  uuid references public.subjects(id) on delete set null,
  material_id uuid references public.materials(id) on delete set null,
  topic       text not null,
  round       smallint not null default 1,   -- nº de refuerzo para este tema
  content     text not null,
  created_at  timestamptz not null default now()
);
create index on public.lessons (user_id, topic, created_at desc);

alter table public.lessons enable row level security;
create policy "datos propios" on public.lessons
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 3. PRIORIDAD por materia
-- prioridad = (100 - dominio promedio) x peso. Mayor número = estudiar antes.
-- Una materia sin temas evaluados (topics_total = 0) necesita primero un
-- diagnóstico: la app debe mostrarla como "sin evaluar".
-- ---------------------------------------------------------------------
create or replace view public.subject_priority
with (security_invoker = true) as
select
  s.id as subject_id,
  s.user_id,
  s.name,
  s.weight,
  count(tp.id) as topics_total,
  count(tp.id) filter (where tp.status = 'approved') as topics_approved,
  coalesce(round(avg(tp.mastery), 2), 0) as mastery,
  round((100 - coalesce(avg(tp.mastery), 0)) * s.weight, 2) as priority
from public.subjects s
left join public.topic_progress tp
  on tp.subject_id = s.id and tp.user_id = s.user_id
group by s.id;

-- ---------------------------------------------------------------------
-- 4. REGISTRAR un intento terminado
-- La app llama a esta función (supabase.rpc) cuando el estudiante termina
-- un examen y ya guardó todas sus respuestas en attempt_answers.
--
-- Reglas:
--  - Un tema solo cambia de estado si en ese examen tuvo 3 preguntas o más.
--  - Aprobado: 60% o más en ese examen. Si no, queda en refuerzo.
--  - Dominio mostrado = 40% del historial + 60% del último resultado.
-- ---------------------------------------------------------------------
create or replace function public.record_exam_attempt(p_attempt_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_exam    uuid;
  v_subject uuid;
  v_score   int;
  v_total   int;
begin
  -- El intento debe ser del usuario que llama
  select a.exam_id into v_exam
  from exam_attempts a
  where a.id = p_attempt_id and a.user_id = auth.uid();
  if v_exam is null then
    raise exception 'Intento no encontrado';
  end if;

  -- Materia del examen (si el material no tiene, se usa "General")
  select m.subject_id into v_subject
  from exams e left join materials m on m.id = e.material_id
  where e.id = v_exam;

  if v_subject is null then
    select id into v_subject from subjects
    where user_id = auth.uid() and name = 'General' limit 1;
    if v_subject is null then
      insert into subjects (user_id, name) values (auth.uid(), 'General')
      returning id into v_subject;
    end if;
  end if;

  -- Resultado global del intento
  select count(*) filter (where aa.is_correct), count(*)
    into v_score, v_total
  from attempt_answers aa where aa.attempt_id = p_attempt_id;

  update exam_attempts
     set score = v_score, total = v_total, finished_at = now()
   where id = p_attempt_id;

  -- Resultado por tema
  with batch as (
    select coalesce(q.topic, 'General') as topic,
           count(*) as total,
           count(*) filter (where aa.is_correct) as correct
    from attempt_answers aa
    join exam_questions q on q.id = aa.question_id
    where aa.attempt_id = p_attempt_id
    group by 1
  )
  insert into topic_progress
    (user_id, subject_id, topic, attempts, correct, mastery,
     status, failed_rounds, last_evaluated_at)
  select auth.uid(), v_subject, b.topic, b.total, b.correct,
         round(100.0 * b.correct / b.total, 2),
         case when b.total < 3 then 'pending'
              when 100.0 * b.correct / b.total >= 60 then 'approved'
              else 'reinforcing' end,
         case when b.total >= 3 and 100.0 * b.correct / b.total < 60
              then 1 else 0 end,
         now()
  from batch b
  on conflict (user_id, subject_id, topic) do update set
    attempts   = topic_progress.attempts + excluded.attempts,
    correct    = topic_progress.correct + excluded.correct,
    mastery    = round(0.4 * topic_progress.mastery + 0.6 * excluded.mastery, 2),
    status     = case when excluded.attempts < 3 then topic_progress.status
                      when excluded.mastery >= 60 then 'approved'
                      else 'reinforcing' end,
    failed_rounds = case when excluded.attempts < 3 then topic_progress.failed_rounds
                         when excluded.mastery >= 60 then 0
                         else topic_progress.failed_rounds + 1 end,
    last_evaluated_at = now(),
    updated_at = now();
end;
$$;

revoke all on function public.record_exam_attempt(uuid) from public, anon;
grant execute on function public.record_exam_attempt(uuid) to authenticated;
