import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Building2, CheckCircle2, LoaderCircle, Save } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { LoadingOverlay } from './LoadingOverlay.tsx';
import { EQUIPMENT_CATALOG } from '../data/equipmentCatalog.ts';
import {
  DISABLED_OFFICE_CAUSES,
  GENERAL_DOCTOR_COUNT_QUESTION,
  getDoctorAvailabilityQuestion,
  getOfficeScheduleQuestion,
  getOperationalTurns,
  OFFICE_ENABLED_QUESTION,
  WEEK_DAYS
} from '../data/officeConfiguration.ts';

export const CompletedUnitModal: React.FC = () => {
  const {
    completedUnitName,
    selectedUnit,
    generalData,
    answers,
    stats,
    user,
    confirmCompletedUnit
  } = useApp();
  const [phase, setPhase] = useState<'review' | 'saving' | 'transition'>('review');

  useEffect(() => {
    setPhase('review');
  }, [completedUnitName]);

  if (!completedUnitName || !selectedUnit) return null;

  const officeNumbers = Array.from({ length: generalData.configuredOffices ?? 0 }, (_, index) => index + 1);
  const displayValue = (value: number | null | undefined) => value ?? 'Sin captura';

  const handleConfirm = async () => {
    setPhase('saving');
    const saved = await confirmCompletedUnit(() => setPhase('transition'));
    if (!saved) setPhase('review');
  };

  if (phase === 'transition') {
    return <LoadingOverlay title="Guardado completado" message="Cargando unidades" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-5"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="completed-unit-title"
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-[#A57F2C] bg-[#002F2A] text-white shadow-[0_24px_90px_rgba(0,0,0,0.7)]"
      >
        <div className="flex items-center gap-3 border-b border-white/15 px-4 py-3 sm:px-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-emerald-300 bg-emerald-500 text-emerald-950">
            <CheckCircle2 className="h-7 w-7" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-[#A57F2C]">Expediente de unidad médica</p>
            <h2 id="completed-unit-title" className="text-lg font-extrabold sm:text-xl">Detalles de la Unidad</h2>
            <p className="text-xs font-semibold text-emerald-300">Captura al 100% lista para guardarse</p>
          </div>
        </div>

        <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          <section className="grid grid-cols-2 gap-x-5 gap-y-3 border-b border-white/15 pb-4 text-xs sm:grid-cols-4">
            <div><span className="block text-[9px] font-bold uppercase text-zinc-400">CLUES</span><strong className="font-mono text-amber-300">{selectedUnit.clues}</strong></div>
            <div><span className="block text-[9px] font-bold uppercase text-zinc-400">Entidad Federativa</span><strong>{selectedUnit.entity}</strong></div>
            <div className="col-span-2"><span className="block text-[9px] font-bold uppercase text-zinc-400">Nombre de Unidad</span><strong>{selectedUnit.name}</strong></div>
            <div><span className="block text-[9px] font-bold uppercase text-zinc-400">Servicio de Internet</span><strong>{generalData.hasInternet}</strong></div>
            <div><span className="block text-[9px] font-bold uppercase text-zinc-400">Consultorios Configurados</span><strong>{displayValue(generalData.configuredOffices)}</strong></div>
            <div><span className="block text-[9px] font-bold uppercase text-zinc-400">Consultorios Habilitados</span><strong>{displayValue(generalData.enabledOffices)}</strong></div>
            <div><span className="block text-[9px] font-bold uppercase text-zinc-400">Temporalmente Inhabilitados</span><strong>{displayValue(generalData.unoperatedOffices)}</strong></div>
            <div><span className="block text-[9px] font-bold uppercase text-zinc-400">Total Medicina General</span><strong>{displayValue(generalData.totalGeneralOffices)}</strong></div>
            <div><span className="block text-[9px] font-bold uppercase text-zinc-400">Progreso de Captura</span><strong className="text-emerald-300">{stats.progressPercentage}% completado</strong></div>
            <div><span className="block text-[9px] font-bold uppercase text-zinc-400">Campos Capturados</span><strong>{stats.answeredCount} de {stats.totalQuestions}</strong></div>
            <div className="col-span-2"><span className="block text-[9px] font-bold uppercase text-zinc-400">Capturista Registrado</span><strong>{user ? `${user.name} (${user.email})` : 'Sin registro'}</strong></div>
          </section>

          <div className="space-y-4">
            {officeNumbers.map((officeNumber) => {
              const isEnabled = answers[`${officeNumber}__${OFFICE_ENABLED_QUESTION}`]?.value === 1;
              const turn = generalData.turns[officeNumber] || '';
              const causes = DISABLED_OFFICE_CAUSES
                .filter((cause) => answers[`${officeNumber}__${cause.question}`]?.value === 1)
                .map((cause) => cause.label);
              const schedules = getOperationalTurns(turn).flatMap((operationalTurn) =>
                WEEK_DAYS.flatMap((day) => {
                  const hasSchedule = answers[`${officeNumber}__${getOfficeScheduleQuestion(operationalTurn, day.key)}`]?.value === 1;
                  if (!hasSchedule) return [];
                  const hasDoctor = answers[`${officeNumber}__${getDoctorAvailabilityQuestion(operationalTurn, day.key)}`]?.value === 1;
                  return [`${operationalTurn} · ${day.key}: ${hasDoctor ? 'con médico' : 'sin médico'}`];
                })
              );
              const equipment = EQUIPMENT_CATALOG.map((item) => ({
                name: item.name,
                value: answers[`${officeNumber}__${item.name}`]?.value
              })).filter((item) => item.value !== null && item.value !== undefined);

              return (
                <section key={officeNumber} className="border-b border-white/10 pb-4 last:border-0">
                  <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <h3 className="flex items-center gap-1.5 font-extrabold text-amber-300"><Building2 className="h-4 w-4" />Consultorio {officeNumber}</h3>
                    <span>Habilitado: <strong className={isEnabled ? 'text-emerald-300' : 'text-rose-300'}>{isEnabled ? 'SÍ' : 'NO'}</strong></span>
                    {isEnabled && <span>Turno: <strong>{turn || 'Sin turno'}</strong></span>}
                    {isEnabled && <span>Médicos generales: <strong>{displayValue(answers[`${officeNumber}__${GENERAL_DOCTOR_COUNT_QUESTION}`]?.value)}</strong></span>}
                    {!isEnabled && <span>Causas: <strong>{causes.join(', ') || 'Sin captura'}</strong></span>}
                  </div>

                  {isEnabled && (
                    <>
                      <div className="mb-2 text-[10px] text-zinc-300">
                        <span className="font-bold uppercase text-zinc-400">Horarios: </span>
                        {schedules.join(' | ') || 'Sin horarios registrados'}
                      </div>
                      <div className="grid grid-cols-1 gap-x-5 gap-y-1 text-[10px] sm:grid-cols-2 lg:grid-cols-3">
                        {equipment.map((item) => (
                          <div key={item.name} className="flex justify-between gap-2 border-b border-white/5 py-1">
                            <span className="min-w-0 text-zinc-300">{item.name}</span>
                            <strong className="shrink-0 text-amber-200">{item.value}</strong>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </section>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/15 bg-black/20 px-4 py-3 sm:px-6">
          <p className="text-[10px] text-zinc-300">Revise el expediente antes de confirmar. La unidad permanecerá abierta si el guardado falla.</p>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={phase === 'saving'}
            className="flex shrink-0 items-center gap-2 rounded-md bg-[#A57F2C] px-4 py-2 text-xs font-extrabold text-black hover:bg-[#b88f33] disabled:cursor-wait disabled:opacity-60"
          >
            {phase === 'saving' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {phase === 'saving' ? 'GUARDANDO...' : 'ACEPTAR Y GUARDAR'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};