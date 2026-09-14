import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, Save, Stethoscope, Trash2, X } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import {
  DISABLED_CAUSE_CONFIRMATION_QUESTION,
  DISABLED_OFFICE_CAUSES,
  GENERAL_DOCTOR_COUNT_QUESTION,
  getDoctorAvailabilityQuestion,
  getOfficeScheduleQuestion,
  getOperationalTurns,
  OFFICE_ENABLED_QUESTION,
  WEEK_DAYS,
  type OperationalTurn
} from '../data/officeConfiguration.ts';
import { QuestionAnswer, TurnType } from '../types.ts';

interface OfficeConfigurationPanelProps {
  officeNumber: number;
}

const TURN_OPTIONS: TurnType[] = ['Matutino', 'Vespertino', 'Ambos'];

export const OfficeConfigurationPanel: React.FC<OfficeConfigurationPanelProps> = ({ officeNumber }) => {
  const { generalData, answers, handleSetTurn, handleSaveAnswer } = useApp();
  const currentTurn = generalData.turns[officeNumber] === 'Matutino'
    || generalData.turns[officeNumber] === 'Vespertino'
    || generalData.turns[officeNumber] === 'Ambos'
      ? generalData.turns[officeNumber]
      : '';
  const countKey = `${officeNumber}__${GENERAL_DOCTOR_COUNT_QUESTION}`;
  const enabledValue = answers[`${officeNumber}__${OFFICE_ENABLED_QUESTION}`]?.value;
  const isEnabled = enabledValue === 1;
  const isDisabled = enabledValue === 0;
  const savedCount = answers[countKey]?.value;
  const [doctorCount, setDoctorCount] = useState(savedCount === null || savedCount === undefined ? '' : String(savedCount));
  const [isCountConfirmationPending, setIsCountConfirmationPending] = useState(false);
  const [pendingTurn, setPendingTurn] = useState<TurnType | null>(null);
  const [turnsToDelete, setTurnsToDelete] = useState<OperationalTurn[]>([]);
  const [disabledCauses, setDisabledCauses] = useState<string[]>([]);
  const causesConfirmed = answers[`${officeNumber}__${DISABLED_CAUSE_CONFIRMATION_QUESTION}`]?.value === 1;
  const savedDisabledCauses = DISABLED_OFFICE_CAUSES
    .filter((cause) => answers[`${officeNumber}__${cause.question}`]?.value === 1)
    .map((cause) => cause.key);
  const causesAreSaved = causesConfirmed
    && disabledCauses.length === savedDisabledCauses.length
    && disabledCauses.every((cause) => savedDisabledCauses.includes(cause));

  useEffect(() => {
    setDoctorCount(savedCount === null || savedCount === undefined ? '' : String(savedCount));
    setIsCountConfirmationPending(false);
  }, [savedCount]);

  useEffect(() => {
    setDisabledCauses(savedDisabledCauses);
  }, [answers, officeNumber]);

  const saveDoctorCount = async () => {
    if (doctorCount === '') return;
    if (!isCountConfirmationPending) {
      setIsCountConfirmationPending(true);
      return;
    }
    setIsCountConfirmationPending(false);
    await handleSaveAnswer(officeNumber, GENERAL_DOCTOR_COUNT_QUESTION, Number(doctorCount));
  };

  const requestTurnChange = (turn: TurnType) => {
    if (!turn || turn === currentTurn) return;
    const removedTurns: OperationalTurn[] = turn === 'Ambos' || !currentTurn
      ? []
      : currentTurn === 'Ambos'
        ? [turn === 'Matutino' ? 'Vespertino' : 'Matutino']
        : [currentTurn];
    const hasSavedSchedule = (Object.values(answers) as QuestionAnswer[]).some((answer) =>
      answer.officeNumber === officeNumber
      && removedTurns.some((removedTurn) => answer.question.includes(`${removedTurn} - `))
      && (answer.question.startsWith('¿Opera en este horario? ') || answer.question.startsWith('¿Cuenta con médico general? '))
    );
    if (!hasSavedSchedule) {
      void handleSetTurn(officeNumber, turn);
      return;
    }
    setPendingTurn(turn);
    setTurnsToDelete(removedTurns);
  };

  const confirmTurnChange = async () => {
    if (!pendingTurn) return;
    const nextTurn = pendingTurn;
    setPendingTurn(null);
    setTurnsToDelete([]);
    await handleSetTurn(officeNumber, nextTurn);
  };

  const toggleDisabledCause = (causeKey: string) => {
    setDisabledCauses((current) => current.includes(causeKey)
      ? current.filter((key) => key !== causeKey)
      : [...current, causeKey]);
  };

  const saveDisabledCauses = async () => {
    if (disabledCauses.length === 0) return;
    await handleSaveAnswer(officeNumber, DISABLED_CAUSE_CONFIRMATION_QUESTION, 0, true);
    for (const cause of DISABLED_OFFICE_CAUSES) {
      await handleSaveAnswer(
        officeNumber,
        cause.question,
        disabledCauses.includes(cause.key) ? 1 : 0,
        true
      );
    }
    await handleSaveAnswer(officeNumber, DISABLED_CAUSE_CONFIRMATION_QUESTION, 1, true);
  };

  return (
    <div className="w-full min-w-0 space-y-2 rounded-md border border-white/15 bg-black/20 p-2 text-left">
      <div className="flex items-center justify-between gap-2 rounded-md border border-white/15 bg-[#002F2A]/70 px-2 py-1">
        <p className="text-[10px] font-bold text-white">¿Está habilitado?</p>
        <div className="flex gap-1">
          {([['SÍ', 1], ['NO', 0]] as const).map(([label, value]) => (
            <button
              key={label}
              type="button"
              onClick={() => handleSaveAnswer(officeNumber, OFFICE_ENABLED_QUESTION, value, true)}
              aria-label={`Consultorio ${officeNumber} habilitado: ${label}`}
              className={`flex h-6 w-6 items-center justify-center rounded-full border text-[8px] font-extrabold transition-colors ${
                enabledValue === value
                  ? value === 1
                    ? 'border-emerald-200 bg-emerald-500 text-emerald-950 shadow-[0_0_14px_rgba(52,211,153,0.45)]'
                    : 'border-rose-200 bg-rose-600 text-white shadow-[0_0_14px_rgba(225,29,72,0.45)]'
                  : 'border-white/30 bg-white/5 text-zinc-200 hover:bg-white/15'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!isEnabled && (
        <div className={`rounded-md border px-2 py-1.5 text-center text-[9px] font-semibold ${
          isDisabled
            ? 'border-rose-400/40 bg-rose-950/60 text-rose-200'
            : 'border-amber-400/40 bg-amber-950/40 text-amber-200'
        }`}>
          {isDisabled
            ? 'Consultorio no habilitado. La captura de este consultorio está bloqueada.'
            : 'Seleccione Sí para habilitar la captura de este consultorio.'}
        </div>
      )}

      {isDisabled && (
        <div className="space-y-1.5 rounded-md border border-rose-400/40 bg-rose-950/35 p-2">
          <p className="text-[9px] font-bold leading-snug text-rose-100">
            ¿Cuál es la causa por la que el consultorio {officeNumber} no se encuentra habilitado?
          </p>
          <p className="text-[8px] text-rose-200/80">Seleccione una o más opciones:</p>
          <div className="grid grid-cols-3 gap-1">
            {DISABLED_OFFICE_CAUSES.map((cause) => {
              const isSelected = disabledCauses.includes(cause.key);
              return (
                <button
                  key={cause.key}
                  type="button"
                  onClick={() => toggleDisabledCause(cause.key)}
                  aria-pressed={isSelected}
                  className={`flex min-h-8 items-center justify-center gap-1 rounded-md border px-1 py-1 text-center text-[8px] font-bold leading-tight transition-colors ${
                    isSelected
                      ? 'border-amber-200 bg-[#A57F2C] text-black'
                      : 'border-white/20 bg-black/20 text-zinc-200 hover:bg-white/10'
                  }`}
                >
                  <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border ${
                    isSelected ? 'border-black/40 bg-black/10' : 'border-white/40'
                  }`}>
                    {isSelected && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                  </span>
                  {cause.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={saveDisabledCauses}
            disabled={disabledCauses.length === 0}
            className="flex w-full items-center justify-center gap-1 rounded-md bg-[#A57F2C] px-2 py-1 text-[8px] font-extrabold text-black transition-colors hover:bg-[#b88f33] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {causesAreSaved ? <Check className="h-3 w-3" /> : <Save className="h-3 w-3" />}
            {causesAreSaved ? 'CAUSAS GUARDADAS' : 'GUARDAR CAUSAS'}
          </button>
        </div>
      )}

      {isEnabled && <div className="flex items-center gap-2">
        <p className="w-12 shrink-0 text-[9px] font-bold uppercase text-amber-300">Turno</p>
        <div className="grid flex-1 grid-cols-3 overflow-hidden rounded-md border border-white/20">
          {TURN_OPTIONS.map((turn) => (
            <button
              key={turn}
              type="button"
              onClick={() => requestTurnChange(turn)}
              className={`px-1 py-1 text-[9px] font-bold transition-colors ${
                currentTurn === turn
                  ? 'bg-[#A57F2C] text-black'
                  : 'bg-[#002F2A]/80 text-zinc-200 hover:bg-white/10'
              }`}
            >
              {turn}
            </button>
          ))}
        </div>
      </div>}
      {isEnabled && !currentTurn && <p className="text-center text-[8px] font-semibold text-rose-300">Seleccione un turno para habilitar la semana.</p>}

      {isEnabled && <div className="flex items-center gap-2">
        <label htmlFor={`doctor-count-${officeNumber}`} className="flex min-w-0 flex-1 items-center gap-1 text-[9px] font-bold text-emerald-100">
          <Stethoscope className="h-3 w-3 shrink-0 text-emerald-400" />
          <span>¿Con cuántos médicos generales cuenta el consultorio?</span>
        </label>
        <div className="flex gap-1">
          <input
            id={`doctor-count-${officeNumber}`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={doctorCount}
            onChange={(event) => {
              if (event.target.value === '' || /^\d+$/.test(event.target.value)) {
                setDoctorCount(event.target.value);
                setIsCountConfirmationPending(false);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                saveDoctorCount();
              }
            }}
            className="w-10 rounded-md border border-white/20 bg-[#002F2A] px-1 py-1 text-center text-[10px] font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            type="button"
            onClick={saveDoctorCount}
            disabled={doctorCount === ''}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[8px] font-bold text-black disabled:cursor-not-allowed disabled:opacity-40 ${
              isCountConfirmationPending ? 'bg-emerald-400' : 'bg-[#A57F2C] hover:bg-[#b88f33]'
            }`}
          >
            {isCountConfirmationPending ? <Check className="h-3 w-3" /> : <Save className="h-3 w-3" />}
            {isCountConfirmationPending ? 'CONFIRMAR' : 'GUARDAR'}
          </button>
        </div>
      </div>}

      {isEnabled && currentTurn && <div>
        <div className="mb-2 space-y-1">
          <p className="text-[11px] font-bold text-emerald-100">Horario y médico general</p>
          <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold text-zinc-100">
            <span className="inline-flex items-center gap-1 rounded border border-amber-300/50 bg-amber-950/50 px-1.5 py-1">
              <span className="h-3.5 w-3.5 rounded-sm border-2 border-amber-300" />
              Día con horario
            </span>
            <span className="inline-flex items-center gap-1 rounded border border-emerald-300/50 bg-emerald-950/50 px-1.5 py-1">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-emerald-300" />
              Médico disponible
            </span>
          </div>
        </div>
        <div className="overflow-hidden rounded-md border border-white/15">
          <div className="grid grid-cols-[55px_repeat(7,1fr)] bg-[#002F2A] text-center text-[8px] font-bold text-amber-200">
            <span className="p-0.5">Turno</span>
            {WEEK_DAYS.map((day) => <span key={day.key} className="p-0.5" title={day.key}>{day.label}</span>)}
          </div>
          {getOperationalTurns(currentTurn).map((turn) => (
            <div key={turn} className="grid grid-cols-[55px_repeat(7,1fr)] items-center border-t border-white/10">
              <span className="px-1 text-[8px] font-semibold text-zinc-200">{turn === 'Vespertino' ? 'Vesp.' : 'Mat.'}</span>
              {WEEK_DAYS.map((day) => {
                const scheduleQuestion = getOfficeScheduleQuestion(turn, day.key);
                const hasSchedule = answers[`${officeNumber}__${scheduleQuestion}`]?.value === 1;
                const question = getDoctorAvailabilityQuestion(turn, day.key);
                const value = answers[`${officeNumber}__${question}`]?.value;
                const hasDoctor = hasSchedule && value === 1;
                return (
                  <div key={day.key} className="flex items-center justify-center gap-1 border-l border-white/10 py-1">
                    <button
                      type="button"
                      onClick={() => handleSaveAnswer(officeNumber, scheduleQuestion, hasSchedule ? 0 : 1, true)}
                      title={`${day.key}: ${hasSchedule ? 'Horario asignado' : 'Sin horario'}`}
                      aria-label={`${turn}, ${day.key}: ${hasSchedule ? 'Horario asignado' : 'Sin horario'}`}
                      aria-pressed={hasSchedule}
                      className={`flex h-5 w-5 items-center justify-center rounded-sm border transition-colors ${
                        hasSchedule
                          ? 'border-amber-200 bg-[#A57F2C] text-black'
                          : 'border-white/35 bg-black/30 text-transparent hover:border-white/60 hover:bg-white/10'
                      }`}
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveAnswer(officeNumber, question, hasDoctor ? 0 : 1, true)}
                      disabled={!hasSchedule}
                      title={hasSchedule ? `${day.key}: ${hasDoctor ? 'Con médico' : 'Sin médico'}` : 'Asigne primero el horario'}
                      aria-label={`${turn}, ${day.key}: ${hasDoctor ? 'Con médico' : 'Sin médico'}`}
                      aria-pressed={hasDoctor}
                      className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-25 ${
                        hasDoctor
                          ? 'border-emerald-200 bg-emerald-500 text-emerald-950 shadow-[0_0_10px_rgba(52,211,153,0.45)]'
                          : 'border-white/35 bg-black/30 text-transparent hover:border-white/60 hover:bg-white/10'
                      }`}
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>}

      {pendingTurn && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby={`turn-warning-${officeNumber}`}>
          <div className="w-full max-w-md rounded-md border border-amber-400 bg-[#002F2A] p-5 text-white shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-amber-300" />
                <h3 id={`turn-warning-${officeNumber}`} className="text-base font-bold">Cambiar turno</h3>
              </div>
              <button type="button" onClick={() => setPendingTurn(null)} className="rounded p-1 text-zinc-300 hover:bg-white/10" aria-label="Cancelar cambio de turno">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm leading-relaxed text-zinc-200">
              Tus registros de {turnsToDelete.join(' y ')} se borrarán al cambiar a {pendingTurn}.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setPendingTurn(null)} className="rounded-md border border-white/25 px-3 py-2 text-xs font-bold hover:bg-white/10">
                CANCELAR
              </button>
              <button type="button" onClick={() => void confirmTurnChange()} className="flex items-center gap-1.5 rounded-md bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-500">
                <Trash2 className="h-4 w-4" />
                BORRAR Y CAMBIAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};