-- =====================================================================
-- App de estudio con IA - Esquema inicial (Supabase / PostgreSQL)
-- Cómo usarlo: Supabase > SQL Editor > New query > pegar todo > Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PERFILES (extiende auth.users, que Supabase ya maneja)
-- ---------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  -- Nivel general del estudiante (1 = principiante, 5 = avanzado).
  -- Sirve como dificultad por defecto cuando aún no hay historial.
  level         smallint not null default 1 check (level between 1 and 5),
  created_at    timestamptz not null default now()
);

-- Crea el perfil automáticamente cuando alguien se registra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2. MATERIAS (Matemáticas, Física, etc.)
-- ---------------------------------------------------------------------
create table public.subjects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. MATERIALES (PDFs, imágenes y apuntes subidos)
-- El archivo vive en Supabase Storage; aquí se guarda solo la referencia.
-- ---------------------------------------------------------------------
create table public.materials (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  subject_id  uuid references public.subjects(id) on delete set null,
  title       text not null,
  file_path   text,                       -- ruta en Storage: {user_id}/{archivo}
  file_type   text check (file_type in ('pdf', 'image', 'text')),
  raw_text    text,                       -- apuntes escritos a mano en la app
  status      text not null default 'pending'
              check (status in ('pending', 'processing', 'ready', 'error')),
  created_at  timestamptz not null default now()
);
create index on public.materials (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 4. RESÚMENES generados por la IA
-- ---------------------------------------------------------------------
create table public.summaries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  material_id  uuid not null references public.materials(id) on delete cascade,
  content      text not null,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. FLASHCARDS (con repaso espaciado sencillo)
-- ---------------------------------------------------------------------
create table public.flashcards (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  material_id    uuid not null references public.materials(id) on delete cascade,
  front          text not null,           -- pregunta / concepto
  back           text not null,           -- respuesta / explicación
  difficulty     smallint not null default 2 check (difficulty between 1 and 5),
  interval_days  integer not null default 0,   -- días hasta el próximo repaso
  next_review_at timestamptz not null default now(),
  times_correct  integer not null default 0,
  times_wrong    integer not null default 0,
  created_at     timestamptz not null default now()
);
create index on public.flashcards (user_id, next_review_at);

-- ---------------------------------------------------------------------
-- 6. EXÁMENES, PREGUNTAS, INTENTOS Y RESPUESTAS
-- ---------------------------------------------------------------------
create table public.exams (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  material_id  uuid references public.materials(id) on delete set null,
  title        text not null,
  difficulty   smallint not null default 2 check (difficulty between 1 and 5),
  created_at   timestamptz not null default now()
);

create table public.exam_questions (
  id             uuid primary key default gen_random_uuid(),
  exam_id        uuid not null references public.exams(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  type           text not null check (type in ('multiple_choice', 'true_false', 'open')),
  question       text not null,
  options        jsonb,                   -- ["A...", "B...", "C...", "D..."]
  correct_answer text not null,
  explanation    text,                    -- por qué esa es la respuesta correcta
  topic          text,                    -- tema, para las estadísticas por tema
  position       smallint not null default 0
);

create table public.exam_attempts (
  id           uuid primary key default gen_random_uuid(),
  exam_id      uuid not null references public.exams(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  score        smallint not null default 0,
  total        smallint not null default 0,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz
);

create table public.attempt_answers (
  id           uuid primary key default gen_random_uuid(),
  attempt_id   uuid not null references public.exam_attempts(id) on delete cascade,
  question_id  uuid not null references public.exam_questions(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  user_answer  text,
  is_correct   boolean,
  ai_feedback  text                       -- explicación personalizada del error
);

-- ---------------------------------------------------------------------
-- 7. PROGRESO POR TEMA (base de estadísticas y dificultad adaptativa)
-- ---------------------------------------------------------------------
create table public.topic_progress (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  subject_id  uuid references public.subjects(id) on delete cascade,
  topic       text not null,
  attempts    integer not null default 0,
  correct     integer not null default 0,
  -- Dominio estimado 0-100: indicador interno de la app, no una medida científica
  mastery     numeric(5,2) not null default 0 check (mastery between 0 and 100),
  updated_at  timestamptz not null default now(),
  unique (user_id, subject_id, topic)
);

-- ---------------------------------------------------------------------
-- 8. SESIONES COMPARTIDAS (función QR, fase 2)
-- ---------------------------------------------------------------------
create table public.shared_sessions (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  -- Código largo y aleatorio: es lo que va dentro del QR
  share_code  text not null unique default replace(gen_random_uuid()::text, '-', ''),
  title       text not null,
  content     jsonb not null,             -- resumen + flashcards (NO el PDF original)
  expires_at  timestamptz default (now() + interval '7 days'),
  created_at  timestamptz not null default now()
);

-- Función pública: devuelve el contenido solo si conoces el código y no caducó.
-- La página web del QR y el escáner de la app la usan; la tabla NO se abre al público.
create or replace function public.get_shared_session(p_code text)
returns jsonb
language sql
security definer set search_path = public
as $$
  select jsonb_build_object('title', title, 'content', content)
  from public.shared_sessions
  where share_code = p_code
    and (expires_at is null or expires_at > now())
  limit 1;
$$;
grant execute on function public.get_shared_session(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 9. SEGURIDAD (Row Level Security): cada estudiante ve SOLO lo suyo
-- ---------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.subjects         enable row level security;
alter table public.materials        enable row level security;
alter table public.summaries        enable row level security;
alter table public.flashcards       enable row level security;
alter table public.exams            enable row level security;
alter table public.exam_questions   enable row level security;
alter table public.exam_attempts    enable row level security;
alter table public.attempt_answers  enable row level security;
alter table public.topic_progress   enable row level security;
alter table public.shared_sessions  enable row level security;

create policy "perfil propio" on public.profiles
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Misma regla para todas las tablas que tienen user_id
create policy "datos propios" on public.subjects
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "datos propios" on public.materials
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "datos propios" on public.summaries
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "datos propios" on public.flashcards
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "datos propios" on public.exams
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "datos propios" on public.exam_questions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "datos propios" on public.exam_attempts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "datos propios" on public.attempt_answers
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "datos propios" on public.topic_progress
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "sesiones propias" on public.shared_sessions
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------
-- 10. ALMACENAMIENTO de archivos (bucket privado, una carpeta por usuario)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('materials', 'materials', false)
on conflict (id) do nothing;

create policy "archivos propios" on storage.objects
  for all to authenticated
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
