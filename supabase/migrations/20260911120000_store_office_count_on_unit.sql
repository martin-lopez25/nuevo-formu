begin;

alter table public.respuestas
  add column if not exists consultorios integer
    check (consultorios between 0 and 20);

update public.respuestas as unidad
set consultorios = conteo.consultorio,
    fecha_registro = greatest(unidad.fecha_registro, conteo.fecha_registro)
from public.respuestas as conteo
where unidad.clues_imb = conteo.clues_imb
  and unidad.tipo_registro = 'unidad'
  and conteo.tipo_registro = 'respuesta'
  and conteo.pregunta = 'consultorios';

update public.respuestas
set turno = null
where tipo_registro = 'respuesta'
  and turno is not null;

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
      and consultorio > 0
      and pregunta is not null
      and pregunta <> 'consultorios'
      and valor is not null
      and turno is null
      and consultorios is null
      and internet is null
      and consultorios_habilitados is null
      and consultorios_inhabilitados is null
      and total_consultorios_medicina_general is null)
    or
    (tipo_registro = 'consultorio'
      and consultorio > 0
      and pregunta is null
      and valor is null
      and (turno is null or turno in ('Matutino', 'Vespertino', 'Ambos'))
      and consultorios is null
      and internet is null
      and consultorios_habilitados is null
      and consultorios_inhabilitados is null
      and total_consultorios_medicina_general is null)
  );

select set_config('app.permitir_borrado_respuestas', 'on', true);

delete from public.respuestas
where tipo_registro = 'respuesta'
  and pregunta = 'consultorios';

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
    and tipo_registro in ('respuesta', 'consultorio');

  get diagnostics filas_eliminadas = row_count;
  return filas_eliminadas;
end;
$$;

revoke all on function public.eliminar_respuestas_unidad(text) from public, authenticated;
grant execute on function public.eliminar_respuestas_unidad(text) to anon, service_role;

notify pgrst, 'reload schema';

commit;