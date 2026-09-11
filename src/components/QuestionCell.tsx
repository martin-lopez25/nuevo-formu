import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Check, AlertCircle, Save, X } from 'lucide-react';
import { TurnType } from '../types.ts';
import { NumericStepper } from './NumericStepper.tsx';

interface QuestionCellProps {
  officeNumber: number;
  question: string;
  turn: TurnType;
  disabled?: boolean;
}

export const QuestionCell: React.FC<QuestionCellProps> = ({ officeNumber, question, turn, disabled = false }) => {
  const {
    answers,
    editingCellKey,
    setEditingCell,
    handleSaveAnswer
  } = useApp();

  const cellKey = `${officeNumber}__${question}`;
  const isEditing = editingCellKey === cellKey;
  const currentAnswer = answers[cellKey];

  const [inputValue, setInputValue] = useState<string>(
    currentAnswer && currentAnswer.value !== null && currentAnswer.value !== undefined
      ? String(currentAnswer.value)
      : ''
  );
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSaveConfirmationPending, setIsSaveConfirmationPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setInputValue(
        currentAnswer && currentAnswer.value !== null && currentAnswer.value !== undefined
          ? String(currentAnswer.value)
          : ''
      );
      setErrorMsg('');
      setIsSaveConfirmationPending(false);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isEditing, currentAnswer]);

  const handleStartEdit = () => {
    if (disabled) return;
    setEditingCell(cellKey);
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setErrorMsg('');
    setIsSaveConfirmationPending(false);
  };

  const handleSave = async () => {
    const trimmed = inputValue.trim();

    if (trimmed === '') {
      setEditingCell(null);
      return;
    }

    const num = Number(trimmed);
    if (isNaN(num) || !Number.isInteger(num) || num < 0) {
      setErrorMsg('Solo enteros ≥ 0');
      setIsSaveConfirmationPending(false);
      return;
    }

    if (!isSaveConfirmationPending) {
      setIsSaveConfirmationPending(true);
      setErrorMsg('Presione Confirmar para guardar');
      return;
    }

    setIsSaveConfirmationPending(false);
    setErrorMsg('');
    await handleSaveAnswer(officeNumber, question, num);
  };

  // Determine visual color state
  const isPending = !currentAnswer || currentAnswer.value === null || currentAnswer.value === undefined;
  const isZero = currentAnswer && currentAnswer.value === 0;
  const isPositive = currentAnswer && currentAnswer.value !== null && currentAnswer.value > 0;
  const isCloudSaved = currentAnswer?.status === 'saved_cloud';
  const isSaving = currentAnswer?.status === 'saving';

  let bgClass = 'bg-[#611232]/80 border-[#9B2247] text-rose-100 hover:bg-[#611232]'; // ROJO (Pendiente)
  let statusBadge = 'PENDIENTE';
  let badgeColor = 'text-rose-300';

  if (isSaving) {
    bgClass = 'bg-amber-950/80 border-amber-500 text-amber-200 animate-pulse';
    statusBadge = 'Guardando...';
    badgeColor = 'text-amber-300';
  } else if (isCloudSaved) {
    bgClass = 'bg-[#A57F2C]/30 border-[#A57F2C] text-amber-100 hover:bg-[#A57F2C]/40'; // DORADO (Guardado Nube)
    statusBadge = `${currentAnswer.value} ✓`;
    badgeColor = 'text-amber-300 font-bold';
  } else if (isZero) {
    bgClass = 'bg-blue-950/80 border-blue-500/60 text-blue-100 hover:bg-blue-900/80'; // AZUL (0)
    statusBadge = '0';
    badgeColor = 'text-blue-300 font-bold';
  } else if (isPositive) {
    bgClass = 'bg-emerald-950/80 border-emerald-500/60 text-emerald-100 hover:bg-emerald-900/80'; // VERDE (>0)
    statusBadge = String(currentAnswer.value);
    badgeColor = 'text-emerald-300 font-bold';
  }

  // Tooltip content
  const tooltipText = `Pregunta: ${question} | Consultorio: ${officeNumber} | Turno: ${turn || 'Sin seleccionar'}`;

  return (
    <td className="p-1 sm:p-2 text-center align-middle relative group">
      {disabled ? (
        <div className="flex min-h-10 w-full min-w-[90px] items-center justify-center rounded-lg border border-zinc-600/50 bg-zinc-900/70 px-2 py-2 text-[9px] font-bold text-zinc-400">
          NO HABILITADO
        </div>
      ) : isEditing ? (
        <div className="min-w-[210px] bg-[#1E5B4F]/90 p-2 rounded-lg border border-amber-400 shadow-2xl z-20 relative">
          <div className="flex items-center justify-center gap-1">
            <NumericStepper
              inputRef={inputRef}
              min="0"
              value={inputValue}
              onChange={(value) => {
                setInputValue(value);
                setErrorMsg('');
                setIsSaveConfirmationPending(false);
              }}
              onEnter={handleSave}
              onEscape={handleCancelEdit}
              inputClassName="w-10 px-1 py-1 text-xs font-bold text-white"
            />
            <button
              type="button"
              onClick={handleSave}
              className={`px-2 py-1 text-black font-extrabold text-[10px] rounded transition-colors flex items-center gap-0.5 ${
                isSaveConfirmationPending
                  ? 'bg-emerald-500 hover:bg-emerald-400'
                  : 'bg-[#A57F2C] hover:bg-[#b88f33]'
              }`}
              title={isSaveConfirmationPending ? 'Confirmar guardado (segundo clic)' : 'Guardar (primer clic)'}
            >
              {isSaveConfirmationPending ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
              <span className="hidden sm:inline">{isSaveConfirmationPending ? 'CONFIRMAR' : 'GUARDAR'}</span>
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="p-1 text-zinc-400 hover:text-white rounded transition-colors"
              title="Cancelar (Esc)"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="mt-0.5 text-[9px] leading-tight text-zinc-300">Capture únicamente bienes en condiciones óptimas de funcionamiento.</p>
          {errorMsg && (
            <div className={`absolute -bottom-6 left-0 right-0 text-[10px] px-1 py-0.5 rounded border z-30 ${
              isSaveConfirmationPending
                ? 'text-amber-200 bg-amber-950 border-amber-500'
                : 'text-rose-300 bg-rose-950 border-rose-600'
            }`}>
              {errorMsg}
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleStartEdit}
          title={tooltipText}
          className={`w-full min-w-[70px] sm:min-w-[90px] py-2 px-2 rounded-lg border text-xs transition-all duration-200 flex flex-col items-center justify-center gap-0.5 shadow-sm ${bgClass}`}
        >
          <span className="flex items-center gap-1">
            <span className={badgeColor}>{statusBadge}</span>
            {isCloudSaved && <Check className="w-3 h-3 text-[#A57F2C]" />}
          </span>
        </button>
      )}

      {/* Accessible Tooltip on hover */}
      <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-30 px-2 py-1 rounded bg-black/95 text-[10px] text-zinc-200 border border-white/20 whitespace-nowrap pointer-events-none shadow-xl">
        <p className="font-semibold text-amber-300">{question}</p>
        <p>Consultorio {officeNumber} • Turno: {turn || 'Sin seleccionar'}</p>
      </div>
    </td>
  );
};
