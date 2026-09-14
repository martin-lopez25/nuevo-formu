import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { EQUIPMENT_CATALOG } from '../data/equipmentCatalog.ts';
import { QuestionCell } from './QuestionCell.tsx';
import { OfficeConfigurationPanel } from './OfficeConfigurationPanel.tsx';
import { CheckCircle2, ClipboardList } from 'lucide-react';
import { OFFICE_ENABLED_QUESTION } from '../data/officeConfiguration.ts';

interface QuestionnaireTableProps {
  tableContainerRef?: React.RefObject<HTMLDivElement>;
}

export const QuestionnaireTable: React.FC<QuestionnaireTableProps> = ({ tableContainerRef }) => {
  const { generalData, answers } = useApp();
  const [selectedOffice, setSelectedOffice] = useState(1);

  const officesCount = generalData.configuredOffices ?? 0;
  const officesList = Array.from({ length: officesCount }, (_, i) => i + 1);
  const activeOffice = Math.min(selectedOffice, Math.max(1, officesCount));

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

      <div className="flex flex-wrap gap-1.5 border-b border-white/15 bg-[#002F2A]/70 p-2" role="tablist" aria-label="Consultorios">
        <p className="w-full text-[10px] font-bold text-amber-200">Seleccione el consultorio a llenar</p>
        {officesList.map((officeNumber) => (
          <button
            key={officeNumber}
            type="button"
            role="tab"
            aria-selected={activeOffice === officeNumber}
            aria-controls={`office-panel-${officeNumber}`}
            onClick={() => setSelectedOffice(officeNumber)}
            className={`min-w-10 rounded-md border px-3 py-1.5 text-[10px] font-extrabold transition-colors ${
              activeOffice === officeNumber
                ? 'border-amber-200 bg-[#A57F2C] text-black'
                : 'border-white/20 bg-black/20 text-zinc-200 hover:border-amber-300/60 hover:bg-white/10'
            }`}
          >
            C{officeNumber}
          </button>
        ))}
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
            {EQUIPMENT_CATALOG.map((item, idx) => {
              // Check if all offices in this row have saved answers
              let allAnsweredInRow = true;
              for (const cNum of officesList) {
                const isOfficeDisabled = answers[`${cNum}__${OFFICE_ENABLED_QUESTION}`]?.value === 0;
                if (isOfficeDisabled) continue;
                const ans = answers[`${cNum}__${item.name}`];
                if (!ans || ans.value === null || ans.value === undefined) {
                  allAnsweredInRow = false;
                  break;
                }
              }

              return (
                <tr
                  key={item.id}
                  id={`row-question-${encodeURIComponent(item.name)}`}
                  className={`transition-colors duration-150 ${
                    allAnsweredInRow
                      ? 'bg-emerald-950/20 hover:bg-emerald-950/40'
                      : idx % 2 === 0
                      ? 'bg-[#1E5B4F]/20 hover:bg-white/5'
                      : 'bg-[#1E5B4F]/35 hover:bg-white/5'
                  }`}
                >
                  {/* Sticky First Column: Equipment Question */}
                  <td
                    className={`sticky left-0 z-20 p-2.5 sm:p-3 text-xs border-r border-white/15 backdrop-blur-md ${
                      allAnsweredInRow
                        ? 'bg-[#1E5B4F]/85 text-emerald-300 font-semibold'
                        : 'bg-[#1E5B4F]/80 text-zinc-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="leading-snug">{item.name}</span>
                      {allAnsweredInRow && (
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
          </tbody>
        </table>
      </div>
    </div>
  );
};
