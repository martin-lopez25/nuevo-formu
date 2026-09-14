begin;

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
  filas_eliminadas integer;
begin
  if nullif(trim(p_clues), '') is null or p_consultorio <= 0 then
    raise exception 'Parámetros de consultorio inválidos';
  end if;

  perform set_config('app.permitir_borrado_respuestas', 'on', true);

  delete from public.respuestas
  where clues_imb = upper(trim(p_clues))
    and consultorio = p_consultorio
    and tipo_registro in ('respuesta', 'horario');

  get diagnostics filas_eliminadas = row_count;
  return filas_eliminadas;
end;
$$;

revoke all on function public.eliminar_datos_consultorio_deshabilitado(text, integer) from public, authenticated;
grant execute on function public.eliminar_datos_consultorio_deshabilitado(text, integer) to anon, service_role;

notify pgrst, 'reload schema';

commit;