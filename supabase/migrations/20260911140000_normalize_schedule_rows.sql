begin;

alter table public.respuestas
  add column if not exists medico_disponible boolean;

alter table public.respuestas
  drop constraint if exists respuestas_tipo_registro_check,
  add constraint respuestas_tipo_registro_check
    check (tipo_registro in ('unidad', 'respuesta', 'consultorio', 'horario'));

alter table public.respuestas
  drop constraint if exists respuestas_tipo_datos_check;

alter table public.respuestas
  drop constraint if exists respuestas_turno_check,
  add constraint respuestas_turno_check check (
    turno is null
    or turno in (
      '', 'Matutino', 'Matutino lunes a viernes',
      'Matutino miércoles a domingo',
      'Matutino sábados y domingos (fin de semana)',
      'Vespertino', 'Ambos'
    )
    or turno ~ '^(Matutino|Vespertino) - .+$'
  );

create unique index if not exists respuestas_horario_uidx
  on public.respuestas (clues_imb, consultorio, turno)
  where tipo_registro = 'horario';

insert into public.respuestas (
  fecha_registro, tipo_registro, entidad, usuario_nombre, usuario_email,
  clues_imb, nombre_de_la_unidad, consultorio, turno, habilitado,
  medico_disponible, horarios
)
select
  office.fecha_registro, 'horario', office.entidad, office.usuario_nombre,
  office.usuario_email, office.clues_imb, office.nombre_de_la_unidad,
  office.consultorio, schedule.key || ' - ' || day.value,
  true, day.value = any(coalesce(array(
    select jsonb_array_elements_text(schedule.value->'dias_con_medico')
  ), array[]::text[])), '{}'::jsonb
from public.respuestas office
cross join lateral jsonb_each(office.horarios) schedule
cross join lateral jsonb_array_elements_text(schedule.value->'dias_con_horario') day
where office.tipo_registro = 'consultorio'
  and schedule.key in ('Matutino', 'Vespertino')
on conflict (clues_imb, consultorio, turno) where tipo_registro = 'horario'
do update set
  fecha_registro = excluded.fecha_registro,
  habilitado = excluded.habilitado,
  medico_disponible = excluded.medico_disponible;

insert into public.respuestas (
  fecha_registro, tipo_registro, entidad, usuario_nombre, usuario_email,
  clues_imb, nombre_de_la_unidad, consultorio, turno, habilitado,
  medico_disponible, horarios
)
select
  schedule.fecha_registro, 'horario', schedule.entidad, schedule.usuario_nombre,
  schedule.usuario_email, schedule.clues_imb, schedule.nombre_de_la_unidad,
  schedule.consultorio,
  substring(schedule.pregunta from '^¿Opera en este horario\? (.+)$'),
  schedule.valor = 1,
  coalesce(doctor.valor = 1, false), '{}'::jsonb
from public.respuestas schedule
left join public.respuestas doctor
  on doctor.clues_imb = schedule.clues_imb
  and doctor.consultorio = schedule.consultorio
  and doctor.pregunta = replace(
    schedule.pregunta,
    '¿Opera en este horario?',
    '¿Cuenta con médico general?'
  )
where schedule.tipo_registro = 'respuesta'
  and schedule.pregunta like '¿Opera en este horario?%'
on conflict (clues_imb, consultorio, turno) where tipo_registro = 'horario'
do update set
  fecha_registro = excluded.fecha_registro,
  habilitado = excluded.habilitado,
  medico_disponible = excluded.medico_disponible;

update public.respuestas office
set medicos_generales = doctors.valor,
    fecha_registro = greatest(office.fecha_registro, doctors.fecha_registro)
from public.respuestas doctors
where office.tipo_registro = 'consultorio'
  and doctors.tipo_registro = 'respuesta'
  and doctors.pregunta = '¿Cuántos médicos generales tiene?'
  and office.clues_imb = doctors.clues_imb
  and office.consultorio = doctors.consultorio;

update public.respuestas
set horarios = '{}'::jsonb
where tipo_registro = 'consultorio';

select set_config('app.permitir_borrado_respuestas', 'on', true);

delete from public.respuestas
where tipo_registro = 'respuesta'
  and (
    pregunta = '¿Cuántos médicos generales tiene?'
    or pregunta like '¿Opera en este horario?%'
    or pregunta like '¿Cuenta con médico general?%'
  );

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
      and turno is null and consultorios is null and internet is null
      and consultorios_habilitados is null
      and consultorios_inhabilitados is null
      and total_consultorios_medicina_general is null)
    or
    (tipo_registro = 'consultorio'
      and consultorio > 0 and pregunta is null and valor is null
      and (turno is null or turno in ('Matutino', 'Vespertino', 'Ambos'))
      and consultorios is null and internet is null
      and consultorios_habilitados is null
      and consultorios_inhabilitados is null
      and total_consultorios_medicina_general is null)
    or
    (tipo_registro = 'horario'
      and consultorio > 0 and pregunta is null and valor is null
      and turno ~ '^(Matutino|Vespertino) - .+$'
      and consultorios is null and internet is null
      and consultorios_habilitados is null
      and consultorios_inhabilitados is null
      and total_consultorios_medicina_general is null
      and medicos_generales is null)
  );

create or replace function public.eliminar_respuestas_unidad(p_clues text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  filas_eliminadas integer;
begin
  if nullif(trim(p_clues), '') is null then
    raise exception 'CLUES es obligatoria';
  end if;

  perform set_config('app.permitir_borrado_respuestas', 'on', true);

  delete from public.respuestas
  where clues_imb = upper(trim(p_clues))
    and tipo_registro in ('respuesta', 'consultorio', 'horario');

  get diagnostics filas_eliminadas = row_count;
  return filas_eliminadas;
end;
$$;

revoke all on function public.eliminar_respuestas_unidad(text) from public, authenticated;
grant execute on function public.eliminar_respuestas_unidad(text) to anon, service_role;

notify pgrst, 'reload schema';

commit;