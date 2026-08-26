import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Wifi, Users, AlertCircle, CheckCircle2, Sliders, ChevronDown, ListFilter } from 'lucide-react';
import { EQUIPMENT_CATALOG } from '../data/equipmentCatalog.ts';

interface GeneralQuestionsProps {
  onScrollToQuestion?: (questionName: string) => void;
}

export const GeneralQuestions: React.FC<GeneralQuestionsProps> = ({ onScrollToQuestion }) => {
  const {
    selectedUnit,
    generalData,
    handleSetInternet,
    handleSetEnabledOffices,
    handleConfigureOffices,
    stats,
    answers
  } = useApp();

  const [officeCountInput, setOfficeCountInput] = useState<number>(generalData.configuredOffices ?? 1);
  const [enabledInput, setEnabledInput] = useState<number>(generalData.enabledOffices ?? 1);

  useEffect(() => {
    setOfficeCountInput(generalData.configuredOffices ?? 1);
    setEnabledInput(generalData.enabledOffices ?? 1);
  }, [generalData.configuredOffices, generalData.enabledOffices]);

  if (!selectedUnit) return null;

  // Find all missing questions across all configured offices
  const missingQuestionsList: { office: number; question: string }[] = [];
  for (let c = 1; c <= generalData.configuredOffices; c++) {
    EQUIPMENT_CATALOG.forEach((q) => {
      const ans = answers[`${c}__${q.name}`];
      if (!ans || ans.value === null || ans.value === undefined) {
        missingQuestionsList.push({ office: c, question: q.name });
      }
    });
  }

  const handleApplyOfficeCount = (e: React.FormEvent) => {
    e.preventDefault();
    handleConfigureOffices(Number(officeCountInput));
  };

  const handleEnabledBlur = () => {
    handleSetEnabledOffices(Number(enabledInput));
  };

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

          {/* Question 2: Consultorios Generales Habilitados */}
          <div className="p-3 rounded-xl bg-black/30 border border-white/10 flex flex-col justify-between space-y-2">
            <label htmlFor="enabled-offices-input" className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#A57F2C]" />
              Consultorios Generales Habilitados:
            </label>
            <div className="flex items-center gap-2">
              <input
                id="enabled-offices-input"
                type="number"
                min="0"
                max="50"
                value={enabledInput}
                onChange={(e) => setEnabledInput(Number(e.target.value))}
                onFocus={(e) => e.currentTarget.select()}
                onBlur={handleEnabledBlur}
                onKeyDown={(e) => e.key === 'Enter' && handleEnabledBlur()}
                className="w-20 px-3 py-1.5 rounded-lg bg-black/40 border border-white/20 text-white font-bold text-center text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <span className="text-xs text-zinc-300 font-medium">habilitados</span>
            </div>
          </div>

        </div>

        {/* Office Configurator Form */}
        <form onSubmit={handleApplyOfficeCount} className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <label htmlFor="office-count-to-capture" className="text-xs font-semibold text-emerald-200">
              Número de consultorios que se capturarán (0 - 20):
            </label>
            <input
              id="office-count-to-capture"
              type="number"
              min="0"
              max="20"
              value={officeCountInput}
              onChange={(e) => setOfficeCountInput(Number(e.target.value))}
              onFocus={(e) => e.currentTarget.select()}
              className="w-20 px-3 py-1.5 rounded-lg bg-black/50 border border-[#A57F2C]/60 text-white font-bold text-center text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-[#A57F2C] hover:bg-[#b88f33] text-black font-bold text-xs shadow-md transition-all uppercase"
              id="btn-aplicar-consultorios"
            >
              APLICAR
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-zinc-300 font-mono">
            <span>Consultorios configurados: <strong className="text-amber-300">{generalData.configuredOffices}</strong></span>
            <span>Último consultorio: <strong className="text-amber-300">{generalData.configuredOffices}</strong></span>
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
