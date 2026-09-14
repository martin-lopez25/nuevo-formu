begin;

alter table public.respuestas
  drop constraint if exists respuestas_horarios_check,
  drop column if exists horarios;

notify pgrst, 'reload schema';

commit;