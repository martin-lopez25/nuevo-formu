import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Wifi, Users, AlertCircle, CheckCircle2, Sliders, ChevronDown, ListFilter } from 'lucide-react';
import { EQUIPMENT_CATALOG } from '../data/equipmentCatalog.ts';
import { NumericStepper } from './NumericStepper.tsx';

interface GeneralQuestionsProps {
  onScrollToQuestion?: (questionName: string) => void;
}

export const GeneralQuestions: React.FC<GeneralQuestionsProps> = ({ onScrollToQuestion }) => {
  const {
    selectedUnit,
    generalData,
    handleSetInternet,
    handleSetGeneralOfficeAvailability,
    handleConfigureOffices,
    stats,
    answers
  } = useApp();

  const [officeCountInput, setOfficeCountInput] = useState(generalData.configuredOffices === null ? '' : String(generalData.configuredOffices));
  const [enabledInput, setEnabledInput] = useState(generalData.enabledOffices === null ? '' : String(generalData.enabledOffices));
  const [unoperatedInput, setUnoperatedInput] = useState(generalData.unoperatedOffices === null ? '' : String(generalData.unoperatedOffices));

  useEffect(() => {
    setOfficeCountInput(generalData.configuredOffices === null ? '' : String(generalData.configuredOffices));
    setEnabledInput(generalData.enabledOffices === null ? '' : String(generalData.enabledOffices));
    setUnoperatedInput(generalData.unoperatedOffices === null ? '' : String(generalData.unoperatedOffices));
  }, [generalData.configuredOffices, generalData.enabledOffices, generalData.unoperatedOffices]);

  if (!selectedUnit) return null;

  // Find all missing questions across all configured offices
  const missingQuestionsList: { office: number; question: string }[] = [];
  for (let c = 1; c <= (generalData.configuredOffices ?? 0); c++) {
    EQUIPMENT_CATALOG.forEach((q) => {
      const ans = answers[`${c}__${q.name}`];
      if (!ans || ans.value === null || ans.value === undefined) {
        missingQuestionsList.push({ office: c, question: q.name });
      }
    });
  }

  const handleApplyOfficeCount = (e: React.FormEvent) => {
    e.preventDefault();
    if (officeCountInput === '') return;
    handleConfigureOffices(Number(officeCountInput));
  };

  const saveOfficeAvailability = (enabled = enabledInput, unoperated = unoperatedInput) => {
    if (generalData.hasTemporarilyClosedOffices === 'PENDIENTE') return;
    handleSetGeneralOfficeAvailability(
      generalData.hasTemporarilyClosedOffices,
      enabled === '' ? null : Number(enabled),
      unoperated === '' ? null : Number(unoperated)
    );
  };

  const selectOfficeAvailability = (option: 'SI' | 'NO') => {
    setEnabledInput('');
    setUnoperatedInput('');
    handleSetGeneralOfficeAvailability(option, null, option === 'NO' ? 0 : null);
  };

  const totalInput = enabledInput !== ''
    && (generalData.hasTemporarilyClosedOffices === 'NO' || unoperatedInput !== '')
      ? Number(enabledInput) + (generalData.hasTemporarilyClosedOffices === 'SI' ? Number(unoperatedInput) : 0)
      : '';

  return (
    <div className="w-full space-y-4">
      {/* General Questions Panel */}
      <div className="rounded-3xl backdrop-blur-md bg-[#002F2A]/75 border border-white/25 p-4 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.5)] text-white space-y-4">
        <div className="flex items-center gap-2 border-b border-white/20 pb-2.5">
          <Sliders className="w-4 h-4 text-[#A57F2C]" />
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white drop-shadow-sm">
            Preguntas Generales y Configuración de Consultorios
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Question 1: Internet Service */}
          <div className="p-3 rounded-xl bg-black/30 border border-white/10 flex flex-col justify-between space-y-2">
            <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-[#A57F2C]" />
              ¿Cuenta con servicio de Internet?
            </label>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {(['SI', 'NO', 'PENDIENTE'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSetInternet(opt)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    generalData.hasInternet === opt
                      ? opt === 'SI'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : opt === 'NO'
                        ? 'bg-rose-700 text-white shadow-md'
                        : 'bg-amber-600 text-black shadow-md'
                      : 'bg-white/10 hover:bg-white/20 text-zinc-300'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Question 2: Consultorios de Medicina General */}
          <div className="p-3 rounded-xl bg-black/30 border border-white/10 flex flex-col justify-between space-y-2">
            <div className="text-xs font-semibold text-zinc-200 flex items-start gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#A57F2C]" />
              <span>¿Tiene consultorios que no operan temporalmente por falta de personal u otra causa?</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(['SI', 'NO'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => selectOfficeAvailability(option)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    generalData.hasTemporarilyClosedOffices === option
                      ? option === 'SI'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-rose-700 text-white shadow-md'
                      : 'bg-white/10 hover:bg-white/20 text-zinc-300'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            {generalData.hasTemporarilyClosedOffices !== 'PENDIENTE' && (
              <div className={`grid gap-2 ${generalData.hasTemporarilyClosedOffices === 'SI' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <label className="text-[11px] text-zinc-300">
                  Habilitados
                  <NumericStepper
                    id="enabled-offices-input"
                    min="0"
                    max="50"
                    value={enabledInput}
                    onChange={setEnabledInput}
                    onCommit={(value) => saveOfficeAvailability(value, unoperatedInput)}
                    onBlur={() => saveOfficeAvailability()}
                    onEnter={() => saveOfficeAvailability()}
                    inputClassName="px-1 py-1.5 text-sm font-bold text-white"
                  />
                </label>
                {generalData.hasTemporarilyClosedOffices === 'SI' && (
                  <label className="text-[11px] text-zinc-300">
                    Inhabilitados
                    <NumericStepper
                      min="0"
                      max="50"
                      value={unoperatedInput}
                      onChange={setUnoperatedInput}
                      onCommit={(value) => saveOfficeAvailability(enabledInput, value)}
                      onBlur={() => saveOfficeAvailability()}
                      onEnter={() => saveOfficeAvailability()}
                      inputClassName="px-1 py-1.5 text-sm font-bold text-white"
                    />
                  </label>
                )}
                <div className="text-[11px] text-zinc-300">
                  Total
                  <div className="mt-1 px-2 py-1.5 rounded-lg bg-white/10 border border-white/15 text-amber-300 font-bold text-center text-sm">
                    {totalInput}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Office Configurator Form */}
        <form onSubmit={handleApplyOfficeCount} className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <label htmlFor="office-count-to-capture" className="text-xs font-semibold text-emerald-200">
              Número de consultorios que se capturarán para el informe SUS:
            </label>
            <NumericStepper
              id="office-count-to-capture"
              min="0"
              max="20"
              value={officeCountInput}
              onChange={setOfficeCountInput}
              inputClassName="w-10 px-1 py-1.5 text-sm font-bold text-white"
            />
            <button
              type="submit"
              disabled={officeCountInput === ''}
              className="px-4 py-1.5 rounded-lg bg-[#A57F2C] hover:bg-[#b88f33] text-black font-bold text-xs shadow-md transition-all uppercase disabled:cursor-not-allowed disabled:opacity-40"
              id="btn-aplicar-consultorios"
            >
              APLICAR
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-zinc-300 font-mono">
            <span>Consultorios configurados: <strong className="text-amber-300">{generalData.configuredOffices ?? ''}</strong></span>
            <span>Último consultorio: <strong className="text-amber-300">{generalData.configuredOffices ?? ''}</strong></span>
          </div>
        </form>
      </div>

      {/* Progress Metric & Missing Questions Bar */}
      <div className="rounded-2xl backdrop-blur-xl bg-[#002F2A]/75 border border-[#A57F2C]/30 p-4 shadow-lg text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Overall & Office Progress */}
        <div className="space-y-2 flex-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-200">
              Progreso de llenado: <strong className="text-amber-300 text-sm">{stats.progressPercentage}%</strong>
            </span>
            <span className="text-zinc-300 font-mono">
              Respondidas: <strong className="text-emerald-400">{stats.answeredCount}</strong> / {stats.totalQuestions} | Pendientes: <strong className="text-rose-400">{stats.pendingCount}</strong>
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 rounded-full bg-black/40 overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-[#A57F2C] to-emerald-400 transition-all duration-500 rounded-full"
              style={{ width: `${stats.progressPercentage}%` }}
            />
          </div>

          {/* Office pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
            {Object.entries(stats.officeProgress).map(([cNum, prog]) => {
              const p = prog as { percentage: number; missing: number; total: number };
              return (
                <span
                  key={cNum}
                  className={`px-2 py-0.5 rounded border font-mono ${
                    p.percentage === 100
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-black/30 border-white/10 text-zinc-300'
                  }`}
                >
                  C{cNum}: {p.percentage}% | Faltantes: {p.missing}/{p.total}
                </span>
              );
            })}
          </div>
        </div>

        {/* Right: Missing Questions Dropdown */}
        {missingQuestionsList.length > 0 && onScrollToQuestion && (
          <div className="flex items-center gap-2 self-end md:self-center">
            <ListFilter className="w-4 h-4 text-[#A57F2C]" />
            <select
              onChange={(e) => {
                if (e.target.value) onScrollToQuestion(e.target.value);
              }}
              defaultValue=""
              className="px-3 py-1.5 rounded-lg bg-black/60 border border-[#A57F2C]/40 text-amber-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 max-w-[220px]"
            >
              <option value="" disabled>
                Preguntas faltantes ({missingQuestionsList.length})
              </option>
              {missingQuestionsList.slice(0, 30).map((item, idx) => (
                <option key={`${item.office}_${item.question}_${idx}`} value={item.question}>
                  C{item.office}: {item.question}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
