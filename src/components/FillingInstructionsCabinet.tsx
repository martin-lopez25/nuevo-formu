import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Save } from 'lucide-react';

const DAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

export const FillingInstructionsCabinet: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <div className={`relative shrink-0 ${isOpen ? 'z-[110]' : 'z-50'}`}>
      <button
        type="button"
        className="relative z-[120] flex items-center gap-2 rounded-md p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A57F2C]"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-controls="filling-instructions"
        aria-label={isOpen ? 'Cerrar instrucciones de llenado' : 'Abrir instrucciones de llenado'}
        title={isOpen ? 'Cerrar instrucciones de llenado' : 'Abrir instrucciones de llenado'}
      >
        <div className={`medical-cabinet ${isOpen ? 'is-open' : ''}`} aria-hidden="true">
          <div className="medical-cabinet-back">
            <div className="medical-cabinet-shelf medical-cabinet-upper" />
            <div className="medical-cabinet-shelf medical-cabinet-mid" />
            <div className="medical-cabinet-shelf medical-cabinet-lower" />
          </div>
          <div className="medical-cabinet-front">
            <div className="medical-cabinet-knob" />
          </div>
        </div>
        <span className="hidden max-w-20 text-left text-[9px] font-bold uppercase leading-tight text-white sm:block">
          {isOpen ? 'Dar click para cerrar instrucciones' : 'Dar click para instrucciones'}
        </span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-hidden bg-black/45 px-3 pb-3 pt-20 backdrop-blur-[2px] sm:px-8 sm:pb-8 sm:pt-24"
        >
          <article
            id="filling-instructions"
            className="max-h-full w-full max-w-6xl overflow-y-auto rounded-lg border border-white/60 bg-white/80 text-[#143f38] shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="filling-instructions-title"
          >
            <header className="sticky top-0 z-10 border-b border-white/20 bg-[#1E5B4F]/80 text-white shadow-md backdrop-blur-xl">
              <div className="px-4 py-4 sm:px-8">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300">Botiquín de ayuda para llenar el formulario</p>
                <h2 id="filling-instructions-title" className="text-xl font-extrabold sm:text-2xl">Instrucciones de llenado</h2>
              </div>
            </div>
          </header>

          <main className="mx-auto flex max-w-6xl flex-col px-4 py-6 sm:px-8 sm:py-8">
            <section className="order-1 border-b border-white/15 pb-6">
              <h3 className="mb-3 text-base font-extrabold text-[#1E5B4F]">Guía rápida de captura</h3>
              <ol className="grid gap-3 text-sm leading-relaxed sm:grid-cols-2">
                <li><strong className="text-[#9B2247]">1.</strong> Configure y confirme el número de consultorios.</li>
                <li><strong className="text-[#9B2247]">2.</strong> Indique si el consultorio está habilitado y seleccione su turno.</li>
                <li><strong className="text-[#9B2247]">3.</strong> Capture médicos, días habilitados y horarios de atención.</li>
                <li><strong className="text-[#9B2247]">4.</strong> Registre cada equipo y confirme la cantidad capturada.</li>
              </ol>
            </section>

            <section className="order-2 border-b border-white/15 py-6">
              <h3 className="mb-2 text-base font-extrabold text-[#1E5B4F]">Criterio de contabilización</h3>
              <p className="max-w-5xl text-sm leading-7 text-zinc-700">
                Únicamente se contabilizan los bienes cuya existencia se encuentre en condiciones óptimas de funcionamiento, a fin de que la cantidad reportada corresponda al equipamiento efectivamente disponible para la operación. Los bienes fuera de funcionamiento no deben incluirse, para evitar sobreestimar la disponibilidad y sesgar la determinación de las necesidades de adquisición.
              </p>
            </section>

            <section className="order-3 border-b border-white/15 py-6">
              <div className="mb-4">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#9B2247]">Paso 1</p>
                <h3 className="text-base font-extrabold text-[#1E5B4F]">Características de la Unidad Médica</h3>
                <p className="mt-1 max-w-4xl text-sm leading-6 text-zinc-700">
                  Indique si la unidad cuenta con Internet y capture el número total de consultorios de Medicina General, incluidos los habilitados e inhabilitados.
                </p>
              </div>

              <div className="overflow-hidden rounded-md border border-[#1E5B4F]/25 bg-[#002F2A] p-3 text-white shadow-lg" aria-label="Ejemplo visual de características de la unidad médica">
                <p className="mb-3 text-sm font-extrabold uppercase text-white">Características de la Unidad Médica</p>
                <div className="rounded-md border border-white/15 bg-black/20 p-3">
                  <p className="mb-2 text-xs font-bold">¿Cuenta con servicio de Internet?</p>
                  <div className="grid grid-cols-3 gap-1 text-[10px] font-bold">
                    <span className="rounded-md bg-emerald-500 px-2 py-2 text-center text-white">SÍ</span>
                    <span className="rounded-md bg-white/15 px-2 py-2 text-center">NO</span>
                    <span className="rounded-md bg-white/15 px-2 py-2 text-center">PENDIENTE</span>
                  </div>
                </div>
                <div className="mt-3 border-t border-white/15 pt-3">
                  <p className="text-xs font-bold leading-relaxed">Número total de consultorios de Medicina General con que cuenta la Unidad Médica, incluyendo aquellos habilitados e inhabilitados:</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="flex h-9 w-16 items-center justify-center rounded-md border border-white/25 bg-black/40 text-sm font-bold">0</span>
                    <span className="rounded-md bg-[#A57F2C] px-4 py-2 text-[10px] font-extrabold text-black">APLICAR</span>
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-amber-100">Para evitar capturas accidentales, las cantidades de consultorios requieren presionar Guardar o Aplicar y después Confirmar. También puede presionar Enter dos veces.</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-rose-300/60 bg-rose-950/55 p-3 text-sm leading-6 text-rose-100">
                  <strong>Si captura 0:</strong> significa que la unidad no cuenta con ningún consultorio de Medicina General para registrar.
                </div>
                <div className="rounded-md border border-emerald-300/60 bg-emerald-950/55 p-3 text-sm leading-6 text-emerald-100">
                  <strong>Si captura más de 0:</strong> continúe con la configuración individual de cada consultorio.
                </div>
              </div>
            </section>

            <section className="order-4 border-b border-white/15 py-6">
              <div className="mb-4">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#9B2247]">Paso 2</p>
                <h3 className="text-base font-extrabold text-[#1E5B4F]">Configuración del consultorio</h3>
                <p className="mt-1 max-w-4xl text-sm leading-6 text-zinc-700">
                  Primero indique si el consultorio está habilitado. Seleccione <strong>SÍ</strong> para continuar con el turno, médicos y horarios; seleccione <strong>NO</strong> para registrar las causas de inhabilitación.
                </p>
              </div>

              <div className="mb-4 overflow-hidden rounded-md border border-amber-300 bg-[#002F2A] p-3 text-white shadow-lg" aria-label="Ejemplo visual de selección de habilitación del consultorio">
                <div className="flex items-center justify-between gap-3 rounded-md border border-white/15 bg-[#002F2A]/70 px-3 py-2">
                  <p className="text-xs font-bold">¿Está habilitado?</p>
                  <div className="flex gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/5 text-[10px] font-extrabold">SÍ</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/5 text-[10px] font-extrabold">NO</span>
                  </div>
                </div>
                <p className="mt-2 rounded-md border border-amber-400/40 bg-amber-950/40 px-3 py-2 text-center text-[11px] font-semibold text-amber-200">Seleccione Sí para habilitar la captura de este consultorio.</p>
              </div>

              <h4 className="mb-1 text-sm font-extrabold text-rose-800">Si selecciona NO: consultorio no habilitado</h4>
              <p className="mb-3 max-w-4xl text-sm leading-6 text-zinc-700">
                Seleccione <strong>NO</strong> cuando el consultorio no esté habilitado. Después marque una o más causas y presione <strong>GUARDAR CAUSAS</strong>. El resto de la captura de ese consultorio quedará bloqueado.
              </p>
              <div className="overflow-hidden rounded-md border border-rose-300 bg-[#002F2A] p-3 text-white shadow-lg" aria-label="Ejemplo visual de consultorio no habilitado y selección de causas">
                <div className="flex items-center justify-between gap-3 rounded-md border border-white/15 bg-[#002F2A]/70 px-3 py-2">
                  <p className="text-xs font-bold">¿Está habilitado?</p>
                  <div className="flex gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/5 text-[10px] font-extrabold">SÍ</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-rose-600 text-[10px] font-extrabold shadow-[0_0_14px_rgba(225,29,72,0.45)]">NO</span>
                  </div>
                </div>
                <p className="mt-2 rounded-md border border-rose-400/40 bg-rose-950/60 px-3 py-2 text-center text-[11px] font-semibold text-rose-200">
                  Consultorio no habilitado. La captura de este consultorio está bloqueada.
                </p>
                <div className="mt-2 rounded-md border border-rose-400/40 bg-rose-950/35 p-3">
                  <p className="text-xs font-bold text-rose-100">¿Cuál es la causa por la que el consultorio 1 no se encuentra habilitado?</p>
                  <p className="mt-1 text-[10px] text-rose-200/80">Seleccione una o más opciones:</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {['Infraestructura', 'Equipamiento', 'Recursos Humanos'].map((cause) => (
                      <span key={cause} className="flex min-h-9 items-center justify-center gap-2 rounded-md border border-amber-200 bg-[#A57F2C] px-2 text-center text-[10px] font-bold text-black">
                        <span className="flex h-4 w-4 items-center justify-center rounded-sm border border-black/40 bg-black/10"><Check className="h-3 w-3" strokeWidth={3} /></span>
                        {cause}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-1 rounded-md bg-[#A57F2C] px-2 py-2 text-[10px] font-extrabold text-black">
                    <Save className="h-3.5 w-3.5" /> GUARDAR CAUSAS
                  </div>
                </div>
              </div>

              <h4 className="mb-1 mt-6 text-sm font-extrabold text-emerald-800">Si selecciona SÍ: turno y médicos generales</h4>
              <p className="mb-3 max-w-4xl text-sm leading-6 text-zinc-700">
                Seleccione el turno del consultorio y capture con cuántos médicos generales cuenta. Al elegir un turno se habilitará la semana para registrar los días de atención.
              </p>
              <div className="overflow-hidden rounded-md border border-emerald-300 bg-[#002F2A] p-3 text-white shadow-lg" aria-label="Ejemplo visual de consultorio habilitado, turno y médicos generales">
                <div className="flex items-center justify-between gap-3 rounded-md border border-white/15 bg-[#002F2A]/70 px-3 py-2">
                  <p className="text-xs font-bold">¿Está habilitado?</p>
                  <div className="flex gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-emerald-500 text-[10px] font-extrabold text-emerald-950">SÍ</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/5 text-[10px] font-extrabold">NO</span>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <p className="w-20 shrink-0 text-[10px] font-bold uppercase text-amber-300">Turno</p>
                  <div className="grid flex-1 grid-cols-3 overflow-hidden rounded-md border border-white/20 text-center text-[10px] font-bold">
                    <span className="bg-white/5 px-2 py-2">Matutino</span>
                    <span className="bg-white/5 px-2 py-2">Vespertino</span>
                    <span className="bg-white/5 px-2 py-2">Ambos</span>
                  </div>
                </div>
                <p className="mt-2 text-center text-[10px] font-semibold text-rose-300">Seleccione un turno para habilitar la semana.</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/15 pt-3">
                  <p className="text-xs font-bold text-emerald-100">¿Con cuántos médicos generales cuenta el consultorio?</p>
                  <div className="flex gap-2">
                    <span className="flex h-8 w-14 items-center justify-center rounded-md border border-white/25 bg-black/40 text-xs font-bold">1</span>
                    <span className="rounded-md bg-[#A57F2C] px-3 py-2 text-[10px] font-extrabold text-black">GUARDAR</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="order-6 border-b border-white/15 py-6">
              <div className="mb-4">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#9B2247]">Paso 4</p>
                <h3 className="text-base font-extrabold text-[#1E5B4F]">Guardar cantidades</h3>
                <p className="mt-1 max-w-4xl text-sm leading-6 text-zinc-700">
                  Escriba la cantidad y complete los dos pasos de guardado sobre el mismo botón.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2" aria-label="Ejemplo visual de Guardar y Confirmar una cantidad">
                <div className="rounded-md border border-[#A57F2C] bg-[#1E5B4F] p-4 text-white shadow-lg">
                  <p className="mb-2 text-xs font-extrabold uppercase text-amber-200">Primer clic</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="flex h-9 w-20 items-center justify-center rounded-md border border-white/25 bg-black/40 text-sm font-bold">1</span>
                    <span className="flex items-center gap-1 rounded bg-[#A57F2C] px-3 py-2 text-[11px] font-extrabold text-black"><Save className="h-3.5 w-3.5" /> GUARDAR</span>
                  </div>
                  <p className="mt-2 text-center text-[10px] text-zinc-200">Capture únicamente bienes en condiciones óptimas de funcionamiento.</p>
                </div>

                <div className="rounded-md border border-emerald-400 bg-[#1E5B4F] p-4 text-white shadow-lg">
                  <p className="mb-2 text-xs font-extrabold uppercase text-emerald-200">Segundo clic</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="flex h-9 w-20 items-center justify-center rounded-md border border-white/25 bg-black/40 text-sm font-bold">1</span>
                    <span className="flex items-center gap-1 rounded bg-emerald-500 px-3 py-2 text-[11px] font-extrabold text-black"><Check className="h-3.5 w-3.5" /> CONFIRMAR</span>
                  </div>
                  <p className="mt-2 text-center text-[10px] text-zinc-200">Capture únicamente bienes en condiciones óptimas de funcionamiento.</p>
                  <p className="mt-1 text-center text-[10px] font-bold text-amber-200">Presione Confirmar para guardar.</p>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-md border-2 border-amber-500 bg-amber-100 px-4 py-3 text-amber-950 shadow-sm" role="note">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-sm font-bold leading-6">
                  Importante: debe hacer doble clic en el botón, o bien un clic en <strong>GUARDAR</strong> y después otro clic en <strong>CONFIRMAR</strong>. Si no realiza el segundo clic, la cantidad no se guarda.
                </p>
              </div>
            </section>

            <section className="order-5 py-6">
              <div className="mb-4">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#9B2247]">Paso 3</p>
                <h3 className="text-base font-extrabold text-[#1E5B4F]">Horario y médico general</h3>
                <p className="mt-1 max-w-4xl text-sm leading-6 text-zinc-700">
                  Se busca capturar cada día en que el consultorio está habilitado y señalar si cuenta con un médico general asignado. Primero marque el cuadro de horario; después podrá marcar el círculo de médico disponible.
                </p>
              </div>

              <div className="overflow-hidden rounded-md border border-[#1E5B4F]/25 bg-[#002F2A] text-white shadow-lg" aria-label="Ejemplo visual de captura de horario y médico general">
                <div className="flex flex-wrap gap-2 border-b border-white/15 p-3 text-xs font-semibold">
                  <span className="inline-flex items-center gap-1.5 rounded border border-amber-300/50 bg-amber-950/50 px-2 py-1">
                    <span className="h-4 w-4 rounded-sm border-2 border-amber-300 bg-[#A57F2C]" />
                    Día con horario
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded border border-emerald-300/50 bg-emerald-950/50 px-2 py-1">
                    <span className="h-4 w-4 rounded-full border-2 border-emerald-200 bg-emerald-500" />
                    Médico disponible
                  </span>
                </div>

                <div className="overflow-x-auto p-3 sm:p-5">
                  <div className="min-w-[620px] overflow-hidden rounded-md border border-white/15">
                    <div className="grid grid-cols-[72px_repeat(7,1fr)] bg-[#1E5B4F] text-center text-xs font-bold text-amber-200">
                      <span className="p-2">Turno</span>
                      {DAYS.map((day) => <span key={day} className="border-l border-white/10 p-2">{day}</span>)}
                    </div>
                    <div className="grid grid-cols-[72px_repeat(7,1fr)] items-center border-t border-white/10 bg-black/15">
                      <span className="px-3 py-4 text-xs font-semibold">Mat.</span>
                      {DAYS.map((day, index) => {
                        const hasSchedule = index < 5;
                        const hasDoctor = index === 0 || index === 2 || index === 4;
                        return (
                          <div key={day} className="flex items-center justify-center gap-2 border-l border-white/10 py-4">
                            <span className={`flex h-7 w-7 items-center justify-center rounded-sm border ${hasSchedule ? 'border-amber-200 bg-[#A57F2C] text-black' : 'border-white/35 bg-black/30 text-transparent'}`}>
                              <Check className="h-4 w-4" strokeWidth={3} />
                            </span>
                            <span className={`flex h-7 w-7 items-center justify-center rounded-full border ${hasDoctor ? 'border-emerald-200 bg-emerald-500 text-emerald-950' : 'border-white/35 bg-black/30 text-transparent'} ${!hasSchedule ? 'opacity-25' : ''}`}>
                              <Check className="h-4 w-4" strokeWidth={3} />
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-sm font-bold text-[#1E5B4F]">Opciones para facilitar la captura de las 65 preguntas</p>
                <div className="rounded-md border border-[#1E5B4F]/25 bg-[#1E5B4F] p-3 text-white shadow-lg" aria-label="Captura de las opciones Bloques de 10, Solo pendientes y Ver las 65">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-1 rounded-md border border-white/15 bg-black/20 p-1">
                      <span className="rounded bg-amber-500 px-3 py-2 text-[11px] font-bold text-black">Bloques de 10</span>
                      <span className="rounded px-3 py-2 text-[11px] font-bold text-zinc-200">Solo pendientes (63)</span>
                      <span className="rounded px-3 py-2 text-[11px] font-bold text-zinc-200">Ver las 65</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded border border-white/20 bg-black/20 text-white/30">
                        <ChevronLeft className="h-4 w-4" />
                      </span>
                      <span className="min-w-24 text-center text-xs font-bold text-amber-200">Bloque 1 de 7</span>
                      <span className="flex h-8 w-8 items-center justify-center rounded border border-white/20 bg-black/20 text-white">
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs leading-5 text-zinc-600">
                  Use <strong>Bloques de 10</strong> para avanzar poco a poco, <strong>Solo pendientes</strong> para mostrar únicamente lo que falta o <strong>Ver las 65</strong> para consultar la matriz completa.
                </p>
              </div>
            </section>
          </main>
          </article>
        </div>
      )}
    </div>
  );
};