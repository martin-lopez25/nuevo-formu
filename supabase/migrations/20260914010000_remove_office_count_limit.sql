begin;

alter table public.respuestas
  drop constraint if exists respuestas_consultorios_check;

alter table public.respuestas
  add constraint respuestas_consultorios_check check (consultorios >= 0);

notify pgrst, 'reload schema';

commit;