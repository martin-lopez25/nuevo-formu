begin;

alter table public.respuestas
  add column if not exists categoria_gerencial_ampliada text,
  add column if not exists horarios jsonb not null default '{}'::jsonb;

alter table public.respuestas
  drop constraint if exists respuestas_horarios_check,
  add constraint respuestas_horarios_check
    check (jsonb_typeof(horarios) = 'object');

notify pgrst, 'reload schema';

commit;