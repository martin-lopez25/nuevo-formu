begin;

alter table public.respuestas
  drop constraint if exists respuestas_tipo_datos_check;

update public.respuestas as unidad
set consultorios = legacy.consultorios
from (
  select clues_imb, max(consultorio) as consultorios
  from public.respuestas
  where tipo_registro = 'respuesta'
    and pregunta = 'consultorios'
  group by clues_imb
) as legacy
where unidad.tipo_registro = 'unidad'
  and unidad.clues_imb = legacy.clues_imb
  and unidad.consultorios is null;

delete from public.respuestas
where tipo_registro = 'respuesta'
  and pregunta = 'consultorios';

alter table public.respuestas
  drop column if exists consultorios_habilitados,
  drop column if exists consultorios_inhabilitados,
  drop column if exists total_consultorios_medicina_general;

alter table public.respuestas
  add constraint respuestas_tipo_datos_check check (
    (tipo_registro = 'unidad'
      and consultorio is null and pregunta is null and valor is null and turno is null)
    or
    (tipo_registro = 'respuesta'
      and consultorio > 0 and pregunta is not null and valor is not null
      and pregunta <> 'consultorios'
      and pregunta <> '¿Cuántos médicos generales tiene?'
      and pregunta not like '¿Opera en este horario?%'
      and pregunta not like '¿Cuenta con médico general?%'
      and turno is null and consultorios is null and internet is null)
    or
    (tipo_registro = 'consultorio'
      and consultorio > 0 and pregunta is null and valor is null
      and (turno is null or turno in ('Matutino', 'Vespertino', 'Ambos'))
      and consultorios is null and internet is null)
    or
    (tipo_registro = 'horario'
      and consultorio > 0 and pregunta is null and valor is null
      and turno ~ '^(Matutino|Vespertino) - .+$'
      and consultorios is null and internet is null
      and medicos_generales is null)
  );

notify pgrst, 'reload schema';

commit;