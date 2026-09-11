begin;

alter table public.respuestas
  add column if not exists consultorios_inhabilitados integer
    check (consultorios_inhabilitados >= 0),
  add column if not exists total_consultorios_medicina_general integer
    check (total_consultorios_medicina_general >= 0),
  add column if not exists habilitado boolean,
  add column if not exists causas_inhabilitacion text[] not null default '{}',
  add column if not exists medicos_generales integer
    check (medicos_generales is null or medicos_generales >= 0),
  add column if not exists horarios jsonb not null default '[]'::jsonb
    check (jsonb_typeof(horarios) = 'array');

alter table public.respuestas
  drop constraint if exists respuestas_tipo_registro_check,
  add constraint respuestas_tipo_registro_check
    check (tipo_registro in ('unidad', 'respuesta', 'consultorio'));

alter table public.respuestas
  drop constraint if exists respuestas_tipo_datos_check,
  add constraint respuestas_tipo_datos_check check (
    (tipo_registro = 'unidad'
      and consultorio is null
      and pregunta is null
      and valor is null
      and turno is null)
    or
    (tipo_registro = 'respuesta'
      and consultorio is not null
      and ((pregunta = 'consultorios' and consultorio between 0 and 20)
        or (pregunta <> 'consultorios' and consultorio > 0))
      and pregunta is not null
      and internet is null
      and consultorios_habilitados is null
      and consultorios_inhabilitados is null
      and total_consultorios_medicina_general is null
      and ((pregunta = 'consultorios' and valor is null)
        or (pregunta <> 'consultorios' and valor is not null)))
    or
    (tipo_registro = 'consultorio'
      and consultorio > 0
      and pregunta is null
      and valor is null
      and internet is null
        and consultorios_habilitados is null
        and consultorios_inhabilitados is null
        and total_consultorios_medicina_general is null)
  );

create unique index if not exists respuestas_consultorio_uidx
  on public.respuestas (clues_imb, consultorio)
  where tipo_registro = 'consultorio';

do $migration$
begin
  if to_regclass('public.configuracion_consultorios') is not null
    and to_regclass('public.horarios_consultorios') is not null then
    execute $sql$
      insert into public.respuestas (
        fecha_registro, tipo_registro, entidad, clues_imb, nombre_de_la_unidad,
        consultorio, turno, habilitado, causas_inhabilitacion, medicos_generales, horarios
      )
      select
        configuracion.fecha_actualizacion, 'consultorio', configuracion.entidad,
        configuracion.clues_imb, configuracion.nombre_de_la_unidad, configuracion.consultorio,
        case when configuracion.habilitado = false then null else configuracion.turno end,
        configuracion.habilitado,
        case when configuracion.habilitado = true then '{}' else configuracion.causas_inhabilitacion end,
        case when configuracion.habilitado = false then null else configuracion.medicos_generales end,
        case when configuracion.habilitado = false then '[]'::jsonb
          else coalesce(horarios.items, '[]'::jsonb) end
      from public.configuracion_consultorios configuracion
      left join lateral (
        select jsonb_agg(
          jsonb_build_object(
            'turno', horario.turno,
            'dia', horario.dia,
            'existe_medico', horario.existe_medico
          ) order by horario.turno, horario.dia
        ) as items
        from public.horarios_consultorios horario
        where horario.clues_imb = configuracion.clues_imb
          and horario.consultorio = configuracion.consultorio
      ) horarios on true
      on conflict (clues_imb, consultorio) where tipo_registro = 'consultorio'
      do update set
        fecha_registro = excluded.fecha_registro,
        entidad = excluded.entidad,
        nombre_de_la_unidad = excluded.nombre_de_la_unidad,
        turno = excluded.turno,
        habilitado = excluded.habilitado,
        causas_inhabilitacion = excluded.causas_inhabilitacion,
        medicos_generales = excluded.medicos_generales,
        horarios = excluded.horarios
    $sql$;
  end if;
end;
$migration$;

drop table if exists public.horarios_consultorios;
drop table if exists public.configuracion_consultorios;

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
    and ((tipo_registro = 'respuesta' and pregunta <> 'consultorios')
      or tipo_registro = 'consultorio');

  get diagnostics filas_eliminadas = row_count;
  return filas_eliminadas;
end;
$$;

revoke all on function public.eliminar_respuestas_unidad(text) from public, authenticated;
grant execute on function public.eliminar_respuestas_unidad(text) to anon, service_role;

notify pgrst, 'reload schema';

commit;