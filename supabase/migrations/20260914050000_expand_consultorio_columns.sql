begin;

do $columns$
declare
  pregunta_id integer;
  turno text;
  dia text;
begin
  for pregunta_id in 1..65 loop
    execute format(
      'alter table public.respuestas add column if not exists %I integer check (%I is null or %I >= 0)',
      'p_' || pregunta_id,
      'p_' || pregunta_id,
      'p_' || pregunta_id
    );
  end loop;

  foreach turno in array array['matutino', 'vespertino'] loop
    foreach dia in array array['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] loop
      execute format('alter table public.respuestas add column if not exists %I boolean', 'horario_' || turno || '_' || dia);
      execute format('alter table public.respuestas add column if not exists %I boolean', 'medico_' || turno || '_' || dia);
    end loop;
  end loop;
end;
$columns$;

do $copy_answers$
declare
  pregunta_id integer;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'respuestas' and column_name = 'respuestas_json'
  ) then
    for pregunta_id in 1..65 loop
      execute format(
        'update public.respuestas set %I = (respuestas_json ->> %L)::integer where respuestas_json ? %L',
        'p_' || pregunta_id,
        pregunta_id::text,
        pregunta_id::text
      );
    end loop;
  end if;
end;
$copy_answers$;

do $copy_schedules$
declare
  turno text;
  turno_json text;
  dia text;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'respuestas' and column_name = 'horarios_json'
  ) then
    foreach turno in array array['matutino', 'vespertino'] loop
      turno_json := initcap(turno);
      foreach dia in array array['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] loop
        execute format(
          'update public.respuestas set %I = (horarios_json #>> %L)::boolean, %I = (horarios_json #>> %L)::boolean where horarios_json ? %L',
          'horario_' || turno || '_' || dia,
          array[turno_json || ' - ' || dia, 'habilitado'],
          'medico_' || turno || '_' || dia,
          array[turno_json || ' - ' || dia, 'medico_disponible'],
          turno_json || ' - ' || dia
        );
      end loop;
    end loop;
  end if;
end;
$copy_schedules$;

create or replace function public.guardar_respuesta_consultorio(
  p_clues text,
  p_consultorio integer,
  p_pregunta_id text,
  p_valor integer,
  p_entidad text,
  p_usuario_nombre text,
  p_usuario_email text,
  p_nombre_unidad text
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  marca_tiempo timestamptz := now();
  columna text;
begin
  if nullif(trim(p_clues), '') is null or p_consultorio <= 0
    or p_pregunta_id !~ '^[0-9]+$'
    or p_pregunta_id::integer not between 1 and 65
    or p_valor < 0 then
    raise exception 'Respuesta de equipamiento inválida';
  end if;

  columna := 'p_' || p_pregunta_id;

  insert into public.respuestas (
    fecha_registro, tipo_registro, entidad, usuario_nombre, usuario_email,
    clues_imb, nombre_de_la_unidad, consultorio, catalogo_version
  ) values (
    marca_tiempo, 'consultorio', p_entidad, p_usuario_nombre, p_usuario_email,
    upper(trim(p_clues)), p_nombre_unidad, p_consultorio, 1
  )
  on conflict (clues_imb, consultorio) where tipo_registro = 'consultorio'
  do update set
    fecha_registro = excluded.fecha_registro,
    entidad = excluded.entidad,
    usuario_nombre = excluded.usuario_nombre,
    usuario_email = excluded.usuario_email,
    nombre_de_la_unidad = excluded.nombre_de_la_unidad,
    catalogo_version = 1;

  execute format(
    'update public.respuestas set %I = $1 where clues_imb = $2 and tipo_registro = ''consultorio'' and consultorio = $3',
    columna
  ) using p_valor, upper(trim(p_clues)), p_consultorio;

  return marca_tiempo;
end;
$$;

create or replace function public.guardar_horario_consultorio(
  p_clues text,
  p_consultorio integer,
  p_slot text,
  p_campo text,
  p_valor boolean,
  p_entidad text,
  p_usuario_nombre text,
  p_usuario_email text,
  p_nombre_unidad text
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  marca_tiempo timestamptz := now();
  partes text[];
  turno text;
  dia text;
  columna text;
begin
  partes := regexp_match(p_slot, '^(Matutino|Vespertino) - (lunes|martes|miercoles|jueves|viernes|sabado|domingo)$');
  if nullif(trim(p_clues), '') is null or p_consultorio <= 0
    or partes is null or p_campo not in ('habilitado', 'medico_disponible') then
    raise exception 'Horario inválido';
  end if;

  turno := lower(partes[1]);
  dia := partes[2];
  columna := case p_campo
    when 'habilitado' then 'horario_' || turno || '_' || dia
    else 'medico_' || turno || '_' || dia
  end;

  insert into public.respuestas (
    fecha_registro, tipo_registro, entidad, usuario_nombre, usuario_email,
    clues_imb, nombre_de_la_unidad, consultorio, catalogo_version
  ) values (
    marca_tiempo, 'consultorio', p_entidad, p_usuario_nombre, p_usuario_email,
    upper(trim(p_clues)), p_nombre_unidad, p_consultorio, 1
  )
  on conflict (clues_imb, consultorio) where tipo_registro = 'consultorio'
  do update set
    fecha_registro = excluded.fecha_registro,
    entidad = excluded.entidad,
    usuario_nombre = excluded.usuario_nombre,
    usuario_email = excluded.usuario_email,
    nombre_de_la_unidad = excluded.nombre_de_la_unidad;

  execute format(
    'update public.respuestas set %I = $1 where clues_imb = $2 and tipo_registro = ''consultorio'' and consultorio = $3',
    columna
  ) using p_valor, upper(trim(p_clues)), p_consultorio;

  return marca_tiempo;
end;
$$;

create or replace function public.eliminar_horarios_turno(
  p_clues text,
  p_consultorio integer,
  p_turno text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  filas_actualizadas integer;
  asignaciones text;
  turno text := lower(p_turno);
begin
  if nullif(trim(p_clues), '') is null or p_consultorio <= 0
    or p_turno not in ('Matutino', 'Vespertino') then
    raise exception 'Parámetros de turno inválidos';
  end if;

  select string_agg(format('%I = null, %I = null', 'horario_' || turno || '_' || dia, 'medico_' || turno || '_' || dia), ', ')
  into asignaciones
  from unnest(array['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']) as dia;

  execute format(
    'update public.respuestas set %s, fecha_registro = now() where clues_imb = $1 and tipo_registro = ''consultorio'' and consultorio = $2',
    asignaciones
  ) using upper(trim(p_clues)), p_consultorio;

  get diagnostics filas_actualizadas = row_count;
  return filas_actualizadas;
end;
$$;

create or replace function public.eliminar_datos_consultorio_deshabilitado(
  p_clues text,
  p_consultorio integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  filas_actualizadas integer;
  asignaciones text;
begin
  if nullif(trim(p_clues), '') is null or p_consultorio <= 0 then
    raise exception 'Parámetros de consultorio inválidos';
  end if;

  select string_agg(format('%I = null', nombre), ', ')
  into asignaciones
  from (
    select 'p_' || numero as nombre from generate_series(1, 65) as numero
    union all
    select prefijo || turno || '_' || dia
    from unnest(array['horario_', 'medico_']) as prefijo,
         unnest(array['matutino', 'vespertino']) as turno,
         unnest(array['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']) as dia
  ) columnas;

  execute format(
    'update public.respuestas set %s, turno = null, medicos_generales = null, fecha_registro = now() where clues_imb = $1 and tipo_registro = ''consultorio'' and consultorio = $2',
    asignaciones
  ) using upper(trim(p_clues)), p_consultorio;

  get diagnostics filas_actualizadas = row_count;
  return filas_actualizadas;
end;
$$;

alter table public.respuestas
  drop constraint if exists respuestas_json_objeto_check,
  drop constraint if exists horarios_json_objeto_check,
  drop column if exists respuestas_json,
  drop column if exists horarios_json;

comment on column public.respuestas.catalogo_version is
  'Versión del catálogo; las cantidades se almacenan en columnas p_ID.';

commit;