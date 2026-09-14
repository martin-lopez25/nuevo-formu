begin;

alter table public.respuestas
  add column if not exists turno_consultorio text;

alter table public.respuestas
  drop constraint if exists respuestas_turno_check,
  add constraint respuestas_turno_consultorio_check check (
    turno_consultorio is null or turno_consultorio in ('Matutino', 'Vespertino', 'Ambos')
  );

do $migrate_schedule$
declare
  expressions text;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'respuestas'
      and column_name = 'horario_matutino_lunes'
  ) then
    select string_agg(
      format(
        'case when %I is true then %L || case when %I is true then ''-med'' else '''' end end',
        'horario_' || selected_turn || '_' || day_name,
        selected_turn || '-' || day_name,
        'medico_' || selected_turn || '_' || day_name
      ),
      ', '
    ) into expressions
    from unnest(array['matutino', 'vespertino']) as turns(selected_turn),
         unnest(array['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']) as days(day_name);

    execute format(
      'update public.respuestas set turno_consultorio = case when turno in (''Matutino'', ''Vespertino'', ''Ambos'') then turno else turno_consultorio end, turno = nullif(concat_ws('', '', %s), '''') where tipo_registro = ''consultorio''',
      expressions
    );
  else
    update public.respuestas
    set turno_consultorio = turno
    where tipo_registro = 'consultorio'
      and turno in ('Matutino', 'Vespertino', 'Ambos')
      and turno_consultorio is null;

    update public.respuestas
    set turno = null
    where tipo_registro = 'consultorio'
      and turno in ('Matutino', 'Vespertino', 'Ambos');
  end if;
end;
$migrate_schedule$;

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
  clave text;
  entradas text[];
  horario_actual text;
begin
  partes := regexp_match(p_slot, '^(Matutino|Vespertino) - (lunes|martes|miercoles|jueves|viernes|sabado|domingo)$');
  if nullif(trim(p_clues), '') is null or p_consultorio <= 0
    or partes is null or p_campo not in ('habilitado', 'medico_disponible') then
    raise exception 'Horario inválido';
  end if;

  clave := lower(partes[1]) || '-' || partes[2];

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

  select turno into horario_actual
  from public.respuestas
  where clues_imb = upper(trim(p_clues))
    and tipo_registro = 'consultorio'
    and consultorio = p_consultorio
  for update;

  select coalesce(array_agg(trim(entrada)) filter (where trim(entrada) <> ''), array[]::text[])
  into entradas
  from unnest(string_to_array(coalesce(horario_actual, ''), ',')) as valores(entrada);

  if p_campo = 'habilitado' then
    if p_valor then
      if not (clave = any(entradas)) and not ((clave || '-med') = any(entradas)) then
        entradas := array_append(entradas, clave);
      end if;
    else
      entradas := array_remove(array_remove(entradas, clave), clave || '-med');
    end if;
  elsif p_valor and clave = any(entradas) then
    entradas := array_replace(entradas, clave, clave || '-med');
  elsif not p_valor and (clave || '-med') = any(entradas) then
    entradas := array_replace(entradas, clave || '-med', clave);
  end if;

  update public.respuestas
  set turno = nullif(array_to_string(entradas, ', '), ''),
      fecha_registro = marca_tiempo
  where clues_imb = upper(trim(p_clues))
    and tipo_registro = 'consultorio'
    and consultorio = p_consultorio;

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
  prefijo text := lower(p_turno) || '-';
begin
  if nullif(trim(p_clues), '') is null or p_consultorio <= 0
    or p_turno not in ('Matutino', 'Vespertino') then
    raise exception 'Parámetros de turno inválidos';
  end if;

  update public.respuestas
  set turno = (
        select nullif(string_agg(trim(entrada), ', '), '')
        from unnest(string_to_array(coalesce(turno, ''), ',')) as valores(entrada)
        where trim(entrada) not like prefijo || '%'
      ),
      fecha_registro = now()
  where clues_imb = upper(trim(p_clues))
    and tipo_registro = 'consultorio'
    and consultorio = p_consultorio;

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

  select string_agg(format('%I = null', 'p_' || numero), ', ')
  into asignaciones
  from generate_series(1, 65) as numeros(numero);

  execute format(
    'update public.respuestas set %s, turno = null, turno_consultorio = null, medicos_generales = null, fecha_registro = now() where clues_imb = $1 and tipo_registro = ''consultorio'' and consultorio = $2',
    asignaciones
  ) using upper(trim(p_clues)), p_consultorio;

  get diagnostics filas_actualizadas = row_count;
  return filas_actualizadas;
end;
$$;

do $drop_schedule_columns$
declare
  selected_turn text;
  day_name text;
begin
  foreach selected_turn in array array['matutino', 'vespertino'] loop
    foreach day_name in array array['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] loop
      execute format('alter table public.respuestas drop column if exists %I', 'horario_' || selected_turn || '_' || day_name);
      execute format('alter table public.respuestas drop column if exists %I', 'medico_' || selected_turn || '_' || day_name);
    end loop;
  end loop;
end;
$drop_schedule_columns$;

alter table public.respuestas
  drop column if exists medico_disponible;

comment on column public.respuestas.turno_consultorio is
  'Turno general del consultorio: Matutino, Vespertino o Ambos.';
comment on column public.respuestas.turno is
  'Horarios compactos separados por coma; el sufijo -med indica disponibilidad de médico.';

commit;
