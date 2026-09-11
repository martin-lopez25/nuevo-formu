alter table public.respuestas
  drop constraint if exists respuestas_turno_check;

alter table public.respuestas
  add constraint respuestas_turno_check check (
    turno is null or turno in (
      '',
      'Matutino',
      'Matutino lunes a viernes',
      'Matutino miércoles a domingo',
      'Matutino sábados y domingos (fin de semana)',
      'Vespertino',
      'Ambos'
    )
  );

comment on column public.respuestas.consultorio is
  'Número de consultorio. La configuración y el equipamiento se almacenan como respuestas por consultorio.';

comment on column public.respuestas.pregunta is
  'Clave estable de equipo o configuración: habilitación, turno, médicos, horario semanal o causa de inhabilitación.';

comment on column public.respuestas.turno is
  'Turno operativo del consultorio. La fila Seleccione el turno es la fuente principal al recargar.';

with turnos_historicos as (
  select distinct on (clues_imb, consultorio)
    fecha_registro,
    entidad,
    usuario_nombre,
    usuario_email,
    clues_imb,
    nombre_de_la_unidad,
    categoria_gerencial_ampliada,
    consultorio,
    turno
  from public.respuestas
  where tipo_registro = 'respuesta'
    and consultorio > 0
    and turno in ('Matutino', 'Vespertino', 'Ambos')
    and pregunta <> 'consultorios'
    and pregunta <> '¿Está habilitado?'
    and pregunta <> 'Causas de inhabilitación confirmadas'
    and pregunta not like 'Causa de inhabilitación:%'
  order by clues_imb, consultorio, fecha_registro desc
)
insert into public.respuestas (
  fecha_registro,
  tipo_registro,
  entidad,
  usuario_nombre,
  usuario_email,
  clues_imb,
  nombre_de_la_unidad,
  categoria_gerencial_ampliada,
  internet,
  consultorios_habilitados,
  consultorios_inhabilitados,
  total_consultorios_medicina_general,
  consultorio,
  pregunta,
  valor,
  turno
)
select
  fecha_registro,
  'respuesta',
  entidad,
  usuario_nombre,
  usuario_email,
  clues_imb,
  nombre_de_la_unidad,
  categoria_gerencial_ampliada,
  null,
  null,
  null,
  null,
  consultorio,
  'Seleccione el turno',
  1,
  turno
from turnos_historicos source
where not exists (
  select 1
  from public.respuestas existing
  where existing.tipo_registro = 'respuesta'
    and existing.clues_imb = source.clues_imb
    and existing.consultorio = source.consultorio
    and existing.pregunta = 'Seleccione el turno'
);