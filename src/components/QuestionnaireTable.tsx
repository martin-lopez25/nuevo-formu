import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { EQUIPMENT_CATALOG } from '../data/equipmentCatalog.ts';
import { QuestionCell } from './QuestionCell.tsx';
import { OfficeConfigurationPanel } from './OfficeConfigurationPanel.tsx';
import { CheckCircle2, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import { OFFICE_ENABLED_QUESTION } from '../data/officeConfiguration.ts';

interface QuestionnaireTableProps {
  tableContainerRef?: React.RefObject<HTMLDivElement>;
}

export const QuestionnaireTable: React.FC<QuestionnaireTableProps> = ({ tableContainerRef }) => {
  const { generalData, answers } = useApp();
  const [selectedOffice, setSelectedOffice] = useState(1);
  const [viewMode, setViewMode] = useState<'blocks' | 'pending' | 'all'>('blocks');
  const [requestedPage, setRequestedPage] = useState(0);

  const officesCount = generalData.configuredOffices ?? 0;
  const officesList = Array.from({ length: officesCount }, (_, i) => i + 1);
  const activeOffice = Math.min(selectedOffice, Math.max(1, officesCount));
  const answeredQuestions = EQUIPMENT_CATALOG.filter((item) => {
    const answer = answers[`${activeOffice}__${item.name}`];
    return answer?.value !== null && answer?.value !== undefined;
  }).length;
  const pendingQuestions = EQUIPMENT_CATALOG.length - answeredQuestions;
  const questionsForView = viewMode === 'pending'
    ? EQUIPMENT_CATALOG.filter((item) => {
        const answer = answers[`${activeOffice}__${item.name}`];
        return answer?.value === null || answer?.value === undefined;
      })
    : EQUIPMENT_CATALOG;
  const pageSize = 10;
  const pageCount = viewMode === 'all' ? 1 : Math.max(1, Math.ceil(questionsForView.length / pageSize));
  const activePage = Math.min(requestedPage, pageCount - 1);
  const visibleQuestions = viewMode === 'all'
    ? questionsForView
    : questionsForView.slice(activePage * pageSize, (activePage + 1) * pageSize);

  const selectOffice = (officeNumber: number) => {
    setSelectedOffice(officeNumber);
    setRequestedPage(0);
  };

  const selectViewMode = (mode: 'blocks' | 'pending' | 'all') => {
    setViewMode(mode);
    setRequestedPage(0);
  };

  if (officesCount === 0) {
    return (
      <div className="w-full p-8 rounded-2xl backdrop-blur-xl bg-[#002F2A]/70 border border-white/10 text-center text-white space-y-2">
        <p className="text-sm font-semibold text-amber-200">
          La unidad ha sido configurada con 0 consultorios para capturar.
        </p>
        <p className="text-xs text-zinc-300">
          Si desea registrar equipamiento, configure al menos 1 consultorio en la sección superior y presione &quot;Aplicar&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-3xl backdrop-blur-md bg-transparent border border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.5)] overflow-hidden text-white">
      {/* Table Title Bar */}
      <div className="p-3 sm:p-4 border-b border-white/15 flex items-center justify-between gap-2 bg-[#1E5B4F]/30 backdrop-blur-sm">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#A57F2C] font-bold block drop-shadow-sm">
            TABLA DINÁMICA DE CAPTURA
          </span>
          <h3 className="text-sm sm:text-base font-bold text-white leading-tight drop-shadow">
            OPERACIÓN Y EQUIPAMIENTO DE CONSULTORIOS DE MEDICINA GENERAL
          </h3>
        </div>
        <div className="text-xs text-amber-300/90 font-mono hidden sm:block">
          {officesCount} Consultorio(s) configurado(s)
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/15 bg-[#002F2A]/70 p-3 sm:p-4" role="tablist" aria-label="Consultorios">
        <div className="mb-1 flex w-full flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-base font-extrabold text-amber-200 sm:text-lg">Seleccione el consultorio a llenar</p>
            <p className="text-[11px] text-zinc-300">Cada consultorio contiene {EQUIPMENT_CATALOG.length} preguntas de equipamiento.</p>
          </div>
          <p className="text-xs font-bold text-amber-300">
            Consultorio {activeOffice}: {answeredQuestions} de {EQUIPMENT_CATALOG.length} respondidas
          </p>
        </div>
        {officesList.map((officeNumber) => (
          <button
            key={officeNumber}
            type="button"
            role="tab"
            aria-selected={activeOffice === officeNumber}
            aria-controls={`office-panel-${officeNumber}`}
            onClick={() => selectOffice(officeNumber)}
            className={`min-w-14 rounded-md border px-4 py-2 text-xs font-extrabold transition-colors ${
              activeOffice === officeNumber
                ? 'border-amber-200 bg-[#A57F2C] text-black'
                : 'border-white/20 bg-black/20 text-zinc-200 hover:border-amber-300/60 hover:bg-white/10'
            }`}
          >
            C{officeNumber}
          </button>
        ))}
      </div>

      <div className="border-b border-white/15 bg-[#1E5B4F]/45 px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 rounded-md border border-white/15 bg-black/20 p-1" aria-label="Opciones de visualización">
            {([
              ['blocks', 'Bloques de 10'],
              ['pending', `Solo pendientes (${pendingQuestions})`],
              ['all', 'Ver las 65']
            ] as const).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => selectViewMode(mode)}
                aria-pressed={viewMode === mode}
                className={`rounded px-3 py-2 text-[11px] font-bold transition-colors ${
                  viewMode === mode
                    ? 'bg-amber-500 text-black'
                    : 'text-zinc-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {viewMode !== 'all' && questionsForView.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRequestedPage(Math.max(0, activePage - 1))}
                disabled={activePage === 0}
                className="flex h-8 w-8 items-center justify-center rounded border border-white/20 bg-black/20 text-white disabled:cursor-not-allowed disabled:opacity-30"
                title="Bloque anterior"
                aria-label="Bloque anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-24 text-center text-xs font-bold text-amber-200">
                Bloque {activePage + 1} de {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setRequestedPage(Math.min(pageCount - 1, activePage + 1))}
                disabled={activePage === pageCount - 1}
                className="flex h-8 w-8 items-center justify-center rounded border border-white/20 bg-black/20 text-white disabled:cursor-not-allowed disabled:opacity-30"
                title="Bloque siguiente"
                aria-label="Bloque siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Vertical scroll container; tabs keep one office visible at a time. */}
      <div
        ref={tableContainerRef}
        id={`office-panel-${activeOffice}`}
        role="tabpanel"
        className="custom-scrollbar relative max-h-[65vh] overflow-x-hidden overflow-y-auto"
      >
        <table className="w-full table-fixed border-collapse text-left text-xs">
          {/* Header row: Column titles */}
          <thead className="sticky top-0 z-30 bg-[#1E5B4F]/85 backdrop-blur-md border-b border-[#A57F2C]/40 shadow-md">
            <tr>
              <th className="sticky left-0 z-30 w-[42%] bg-[#1E5B4F]/90 backdrop-blur-md p-3 font-extrabold text-[#A57F2C] text-xs uppercase tracking-wider border-r border-white/15">
                Pregunta / Equipo
              </th>
              <th className="w-[58%] p-2 text-center text-xs font-bold text-white">
                Consultorio {activeOffice}
              </th>
            </tr>
          </thead>

          {/* Office configuration and equipment rows */}
          <tbody className="divide-y divide-white/10">
            <tr className="bg-[#1E5B4F]/50 border-b border-white/15">
              <td className="sticky left-0 z-20 bg-[#1E5B4F]/90 backdrop-blur-md p-2.5 font-bold text-amber-300 text-xs border-r border-white/15">
                <div className="flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5 text-[#A57F2C]" />
                  <span>Configuración del consultorio</span>
                </div>
              </td>
              <td className="p-1.5 align-top">
                <OfficeConfigurationPanel officeNumber={activeOffice} />
              </td>
            </tr>
            {visibleQuestions.map((item) => {
              const idx = EQUIPMENT_CATALOG.findIndex((catalogItem) => catalogItem.id === item.id);
              const activeAnswer = answers[`${activeOffice}__${item.name}`];
              const isAnswered = activeAnswer?.value !== null && activeAnswer?.value !== undefined;

              return (
                <tr
                  key={item.id}
                  id={`row-question-${encodeURIComponent(item.name)}`}
                  className={`transition-colors duration-150 ${
                    isAnswered
                      ? 'bg-emerald-950/20 hover:bg-emerald-950/40'
                      : idx % 2 === 0
                      ? 'bg-[#1E5B4F]/20 hover:bg-white/5'
                      : 'bg-[#1E5B4F]/35 hover:bg-white/5'
                  }`}
                >
                  {/* Sticky First Column: Equipment Question */}
                  <td
                    className={`sticky left-0 z-20 p-2.5 sm:p-3 text-xs border-r border-white/15 backdrop-blur-md ${
                      isAnswered
                        ? 'bg-[#1E5B4F]/85 text-emerald-300 font-semibold'
                        : 'bg-[#1E5B4F]/80 text-zinc-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="leading-snug">{item.name}</span>
                      {isAnswered && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 ml-auto" />
                      )}
                    </div>
                  </td>

                  {/* Office Cells */}
                  <QuestionCell
                    key={`cell-${activeOffice}-${item.id}`}
                    officeNumber={activeOffice}
                    question={item.name}
                    turn={generalData.turns[activeOffice] || ''}
                    disabled={answers[`${activeOffice}__${OFFICE_ENABLED_QUESTION}`]?.value !== 1}
                  />
                </tr>
              );
            })}
            {viewMode === 'pending' && questionsForView.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-10 text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
                  <p className="font-bold text-emerald-300">No hay preguntas de equipamiento pendientes.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
