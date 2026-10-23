alter table public.lessons
  add column if not exists title text,
  add column if not exists blocks jsonb
    check (blocks is null or jsonb_typeof(blocks) = 'array');