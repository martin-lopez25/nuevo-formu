alter table public.respuestas
  drop constraint if exists respuestas_tipo_datos_check,
  drop constraint if exists respuestas_condicion_funcionamiento_check;

alter table public.respuestas
  drop column if exists condicion_funcionamiento;

alter table public.respuestas
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
  );