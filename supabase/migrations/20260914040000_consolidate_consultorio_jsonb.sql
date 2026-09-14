begin;

alter table public.respuestas
  add column if not exists respuestas_json jsonb not null default '{}'::jsonb,
  add column if not exists horarios_json jsonb not null default '{}'::jsonb,
  add column if not exists catalogo_version integer not null default 1;

create temporary table catalogo_migracion (
  id integer not null,
  nombre text not null
) on commit drop;

insert into catalogo_migracion (id, nombre) values
  (1, 'Equipo de cómputo fijo'),
  (2, 'Banco de altura'),
  (3, 'Banco giratorio'),
  (4, 'Báscula electrónica  con estadímetro'),
  (5, 'Báscula pesabebés electrónica'),
  (6, 'Mesa para colocar báscula pesabebés'),
  (7, 'Bote sanitario con pedal'),
  (8, 'Caja portalaminilla de plástico con separadores'),
  (9, 'Carta Snellen con marco'),
  (10, 'Charola de Mayo de acero inoxidable'),
  (11, 'Cinta métrica'),
  (12, 'Contenedor de jabón líquido'),
  (13, 'Contenedor de toallas desechables'),
  (14, 'Contenedor rígido para RPBI'),
  (15, 'Cubeta de acero inoxidable con porta cubeta rodable con protector de hule'),
  (15, 'Cubeta de acero inoxidable / Porta cubeta rodable con protector de hule'),
  (16, 'Escritorio médico'),
  (17, 'Esfigmomanómetro'),
  (18, 'Espejo vestidor'),
  (19, 'Espejos vaginales'),
  (20, 'Estadímetro pediátrico'),
  (21, 'Estetoscopio cápsula doble'),
  (22, 'Estetoscopio Pinard o doppler fetal portátil'),
  (23, 'Guarda de medicamentos, materiales o instrumental'),
  (24, 'Guardarropa con perchero'),
  (25, 'Lámpara de examinación  de pie rodable'),
  (26, 'Lavabo'),
  (27, 'Martillo percusor'),
  (28, 'Mesa de Mayo de acero inoxidable'),
  (29, 'Mesa Pasteur'),
  (30, 'Mesa universal para exploración con pierneras'),
  (31, 'Estuche de diagnóstico'),
  (32, 'Oximetro de pulso'),
  (33, 'Refrigerador para farmacia'),
  (34, 'Porta rollo para papel Kraft o sábanas'),
  (35, 'Silla para el paciente'),
  (36, 'Silla para el acompañante'),
  (37, 'Asiento para médico'),
  (38, 'Termo congelante integrado para transporte y conservación de vacunas'),
  (39, 'Paquetes refrigerantes para termo'),
  (40, 'Termómetro de vástago'),
  (41, 'Termómetro digital'),
  (42, 'Tijera recta'),
  (43, 'Torundera con tapa de acero Inoxidable'),
  (44, 'Vaso contenedor  de vacunas'),
  (45, 'Laptop'),
  (46, 'Monitor'),
  (47, 'Teclado'),
  (48, 'Mouse'),
  (49, 'No Break'),
  (50, 'Impresora'),
  (51, 'Brazalete para adulto (Esfigmomanómetro)'),
  (52, 'Brazalete pediátrico (Esfigmomanómetro)'),
  (53, 'Negatoscopio'),
  (54, 'Caja con tapa para soluciones desinfectantes'),
  (55, 'Mango para bisturí'),
  (56, 'Pinza de anillos'),
  (57, 'Pinza de disección con dientes'),
  (58, 'Pinza de disección sin dientes'),
  (59, 'Pinza tipo mosquito'),
  (60, 'Pinza para sujetar cuello de matriz'),
  (61, 'Pinza curva'),
  (62, 'Portaaguja recto, con ranura central y estrías cruzadas'),
  (63, 'Riñón de 250 ml o de mayor capacidad'),
  (64, 'Refrigerador para vacunas'),
  (64, 'Refrigerador para conservación y manejo de biológicos'),
  (65, 'Congelador para paquetes fríos'),
  (65, 'Congelador para conservación y manejo de biológicos');

do $validation$
begin
  if exists (
    select 1
    from public.respuestas r
    left join catalogo_migracion c on c.nombre = r.pregunta
    where r.tipo_registro = 'respuesta'
      and r.pregunta <> 'consultorios'
      and c.id is null
  ) then
    raise exception 'Hay preguntas históricas sin ID de catálogo; la migración fue cancelada.';
  end if;
end;
$validation$;

insert into public.respuestas (
  fecha_registro, tipo_registro, entidad, usuario_nombre, usuario_email,
  clues_imb, nombre_de_la_unidad, consultorio, pregunta, valor, turno,
  habilitado, causas_inhabilitacion, medicos_generales,
  respuestas_json, horarios_json, catalogo_version
)
select distinct on (r.clues_imb, r.consultorio)
  r.fecha_registro, 'consultorio', r.entidad, r.usuario_nombre, r.usuario_email,
  r.clues_imb, r.nombre_de_la_unidad, r.consultorio, null, null, null,
  null, '', null, '{}'::jsonb, '{}'::jsonb, 1
from public.respuestas r
where r.tipo_registro in ('respuesta', 'horario')
  and r.consultorio > 0
order by r.clues_imb, r.consultorio, r.fecha_registro desc
on conflict (clues_imb, consultorio) where tipo_registro = 'consultorio'
do nothing;

with respuestas_agrupadas as (
  select
    r.clues_imb,
    r.consultorio,
    jsonb_object_agg(c.id::text, to_jsonb(r.valor) order by r.fecha_registro) as datos
  from public.respuestas r
  join catalogo_migracion c on c.nombre = r.pregunta
  where r.tipo_registro = 'respuesta'
    and r.valor is not null
  group by r.clues_imb, r.consultorio
)
update public.respuestas destino
set respuestas_json = destino.respuestas_json || origen.datos,
    catalogo_version = 1
from respuestas_agrupadas origen
where destino.tipo_registro = 'consultorio'
  and destino.clues_imb = origen.clues_imb
  and destino.consultorio = origen.consultorio;

with horarios_agrupados as (
  select
    clues_imb,
    consultorio,
    jsonb_object_agg(
      turno,
      jsonb_build_object(
        'habilitado', coalesce(habilitado, false),
        'medico_disponible', coalesce(medico_disponible, false)
      ) order by fecha_registro
    ) as datos
  from public.respuestas
  where tipo_registro = 'horario'
    and turno is not null
  group by clues_imb, consultorio
)
update public.respuestas destino
set horarios_json = destino.horarios_json || origen.datos
from horarios_agrupados origen
where destino.tipo_registro = 'consultorio'
  and destino.clues_imb = origen.clues_imb
  and destino.consultorio = origen.consultorio;

do $validation$
declare
  respuestas_esperadas bigint;
  respuestas_migradas bigint;
  horarios_esperados bigint;
  horarios_migrados bigint;
begin
  select count(*) into respuestas_esperadas
  from (
    select distinct r.clues_imb, r.consultorio, c.id
    from public.respuestas r
    join catalogo_migracion c on c.nombre = r.pregunta
    where r.tipo_registro = 'respuesta' and r.valor is not null
  ) datos;

  select count(*)
  into respuestas_migradas
  from public.respuestas r
  cross join lateral jsonb_object_keys(r.respuestas_json)
  where r.tipo_registro = 'consultorio';

  select count(*) into horarios_esperados
  from public.respuestas
  where tipo_registro = 'horario' and turno is not null;

  select count(*)
  into horarios_migrados
  from public.respuestas r
  cross join lateral jsonb_object_keys(r.horarios_json)
  where r.tipo_registro = 'consultorio';

  if respuestas_migradas < respuestas_esperadas or horarios_migrados < horarios_esperados then
    raise exception 'La validación de consolidación falló: respuestas %/%, horarios %/%',
      respuestas_migradas, respuestas_esperadas, horarios_migrados, horarios_esperados;
  end if;
end;
$validation$;

select set_config('app.permitir_borrado_respuestas', 'on', true);

delete from public.respuestas
where tipo_registro in ('respuesta', 'horario');

drop index if exists public.respuestas_celda_uidx;
drop index if exists public.respuestas_horario_uidx;

alter table public.respuestas
  drop constraint if exists respuestas_tipo_registro_check,
  drop constraint if exists respuestas_tipo_datos_check,
  drop constraint if exists respuestas_json_objeto_check,
  drop constraint if exists horarios_json_objeto_check,
  add constraint respuestas_tipo_registro_check
    check (tipo_registro in ('unidad', 'consultorio')),
  add constraint respuestas_tipo_datos_check check (
    (tipo_registro = 'unidad'
      and consultorio is null and pregunta is null and valor is null and turno is null)
    or
    (tipo_registro = 'consultorio'
      and consultorio > 0 and pregunta is null and valor is null and internet is null)
  ),
  add constraint respuestas_json_objeto_check
    check (jsonb_typeof(respuestas_json) = 'object'),
  add constraint horarios_json_objeto_check
    check (jsonb_typeof(horarios_json) = 'object');

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
begin
  if nullif(trim(p_clues), '') is null or p_consultorio <= 0
    or p_pregunta_id !~ '^[0-9]+$'
    or p_pregunta_id::integer not between 1 and 65
    or p_valor < 0 then
    raise exception 'Respuesta de equipamiento inválida';
  end if;

  insert into public.respuestas (
    fecha_registro, tipo_registro, entidad, usuario_nombre, usuario_email,
    clues_imb, nombre_de_la_unidad, consultorio, respuestas_json, catalogo_version
  ) values (
    marca_tiempo, 'consultorio', p_entidad, p_usuario_nombre, p_usuario_email,
    upper(trim(p_clues)), p_nombre_unidad, p_consultorio,
    jsonb_build_object(p_pregunta_id, p_valor), 1
  )
  on conflict (clues_imb, consultorio) where tipo_registro = 'consultorio'
  do update set
    fecha_registro = excluded.fecha_registro,
    entidad = excluded.entidad,
    usuario_nombre = excluded.usuario_nombre,
    usuario_email = excluded.usuario_email,
    nombre_de_la_unidad = excluded.nombre_de_la_unidad,
    respuestas_json = coalesce(public.respuestas.respuestas_json, '{}'::jsonb)
      || excluded.respuestas_json,
    catalogo_version = 1;

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
begin
  if nullif(trim(p_clues), '') is null or p_consultorio <= 0
    or p_slot !~ '^(Matutino|Vespertino) - .+$'
    or p_campo not in ('habilitado', 'medico_disponible') then
    raise exception 'Horario inválido';
  end if;

  insert into public.respuestas (
    fecha_registro, tipo_registro, entidad, usuario_nombre, usuario_email,
    clues_imb, nombre_de_la_unidad, consultorio, horarios_json
  ) values (
    marca_tiempo, 'consultorio', p_entidad, p_usuario_nombre, p_usuario_email,
    upper(trim(p_clues)), p_nombre_unidad, p_consultorio,
    jsonb_build_object(p_slot, jsonb_build_object(p_campo, p_valor))
  )
  on conflict (clues_imb, consultorio) where tipo_registro = 'consultorio'
  do update set
    fecha_registro = excluded.fecha_registro,
    entidad = excluded.entidad,
    usuario_nombre = excluded.usuario_nombre,
    usuario_email = excluded.usuario_email,
    nombre_de_la_unidad = excluded.nombre_de_la_unidad,
    horarios_json = coalesce(public.respuestas.horarios_json, '{}'::jsonb)
      || jsonb_build_object(
        p_slot,
        coalesce(public.respuestas.horarios_json -> p_slot, '{}'::jsonb)
          || jsonb_build_object(p_campo, p_valor)
      );

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
begin
  if nullif(trim(p_clues), '') is null or p_consultorio <= 0
    or p_turno not in ('Matutino', 'Vespertino') then
    raise exception 'Parámetros de turno inválidos';
  end if;

  update public.respuestas
  set horarios_json = coalesce((
    select jsonb_object_agg(clave, valor)
    from jsonb_each(horarios_json) as horario(clave, valor)
    where clave not like p_turno || ' - %'
  ), '{}'::jsonb),
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
begin
  if nullif(trim(p_clues), '') is null or p_consultorio <= 0 then
    raise exception 'Parámetros de consultorio inválidos';
  end if;

  update public.respuestas
  set respuestas_json = '{}'::jsonb,
      horarios_json = '{}'::jsonb,
      turno = null,
      medicos_generales = null,
      fecha_registro = now()
  where clues_imb = upper(trim(p_clues))
    and tipo_registro = 'consultorio'
    and consultorio = p_consultorio;

  get diagnostics filas_actualizadas = row_count;
  return filas_actualizadas;
end;
$$;

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
  where clues_imb = upper(trim(p_clues)) and tipo_registro = 'consultorio';
  get diagnostics filas_eliminadas = row_count;
  return filas_eliminadas;
end;
$$;

revoke all on function public.guardar_respuesta_consultorio(text, integer, text, integer, text, text, text, text) from public, authenticated;
grant execute on function public.guardar_respuesta_consultorio(text, integer, text, integer, text, text, text, text) to anon, service_role;
revoke all on function public.guardar_horario_consultorio(text, integer, text, text, boolean, text, text, text, text) from public, authenticated;
grant execute on function public.guardar_horario_consultorio(text, integer, text, text, boolean, text, text, text, text) to anon, service_role;
revoke all on function public.eliminar_horarios_turno(text, integer, text) from public, authenticated;
grant execute on function public.eliminar_horarios_turno(text, integer, text) to anon, service_role;
revoke all on function public.eliminar_datos_consultorio_deshabilitado(text, integer) from public, authenticated;
grant execute on function public.eliminar_datos_consultorio_deshabilitado(text, integer) to anon, service_role;
revoke all on function public.eliminar_respuestas_unidad(text) from public, authenticated;
grant execute on function public.eliminar_respuestas_unidad(text) to anon, service_role;

comment on column public.respuestas.respuestas_json is
  'Cantidades de equipamiento indexadas por el ID estable de questions.json.';
comment on column public.respuestas.horarios_json is
  'Horarios indexados por turno y día; cada valor contiene habilitado y medico_disponible.';
comment on column public.respuestas.catalogo_version is
  'Versión del catálogo usada para interpretar los IDs de respuestas_json.';

commit;