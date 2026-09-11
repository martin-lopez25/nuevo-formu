begin;

alter table public.respuestas
  drop constraint if exists respuestas_horarios_check;

update public.respuestas as respuesta
set horarios = coalesce((
  select jsonb_object_agg(
    turno_horario.turno,
    jsonb_build_object(
      'dias_con_horario', to_jsonb(turno_horario.dias_con_horario),
      'dias_con_medico', coalesce(to_jsonb(turno_horario.dias_con_medico), '[]'::jsonb)
    )
  )
  from (
    select
      horario->>'turno' as turno,
      array_agg(distinct horario->>'dia' order by horario->>'dia') as dias_con_horario,
      array_agg(distinct horario->>'dia' order by horario->>'dia')
        filter (where coalesce((horario->>'existe_medico')::boolean, false)) as dias_con_medico
    from jsonb_array_elements(respuesta.horarios) as horario
    where horario->>'turno' in ('Matutino', 'Vespertino')
      and nullif(horario->>'dia', '') is not null
    group by horario->>'turno'
  ) as turno_horario
), '{}'::jsonb)
where jsonb_typeof(horarios) = 'array';

update public.respuestas
set horarios = '{}'::jsonb
where horarios is null
  or jsonb_typeof(horarios) <> 'object';

alter table public.respuestas
  alter column horarios set default '{}'::jsonb,
  add constraint respuestas_horarios_check
    check (jsonb_typeof(horarios) = 'object');

notify pgrst, 'reload schema';

commit;