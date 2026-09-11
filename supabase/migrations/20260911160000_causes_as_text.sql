begin;

alter table public.respuestas
  alter column causas_inhabilitacion drop default,
  alter column causas_inhabilitacion type text
    using array_to_string(causas_inhabilitacion, ', '),
  alter column causas_inhabilitacion set default '';

update public.respuestas
set causas_inhabilitacion = ''
where causas_inhabilitacion is null;

alter table public.respuestas
  alter column causas_inhabilitacion set not null;

comment on column public.respuestas.causas_inhabilitacion is
  'Causas seleccionadas separadas por coma en la fila del consultorio.';

notify pgrst, 'reload schema';

commit;