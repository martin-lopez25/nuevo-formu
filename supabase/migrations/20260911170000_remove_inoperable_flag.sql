begin;

alter table public.respuestas
  drop constraint if exists respuestas_tipo_datos_check;

alter table public.respuestas
  drop column if exists tiene_consultorios_inoperantes;

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

notify pgrst, 'reload schema';

commit;