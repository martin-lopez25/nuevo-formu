import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { EQUIPMENT_CATALOG } from '../data/equipmentCatalog.ts';
import { QuestionCell } from './QuestionCell.tsx';
import { TurnType } from '../types.ts';
import { Sun, Moon, Sunrise, CheckCircle2 } from 'lucide-react';

interface QuestionnaireTableProps {
  tableContainerRef?: React.RefObject<HTMLDivElement>;
}

export const QuestionnaireTable: React.FC<QuestionnaireTableProps> = ({ tableContainerRef }) => {
  const {
    generalData,
    answers,
    handleSetTurn
  } = useApp();

  const officesCount = generalData.configuredOffices;
  const officesList = Array.from({ length: officesCount }, (_, i) => i + 1);

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

  // Turn options
  const turnOptions: TurnType[] = ['Matutino', 'Vespertino', 'Ambos'];

  return (
    <div className="w-full rounded-3xl backdrop-blur-md bg-transparent border border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.5)] overflow-hidden text-white">
      {/* Table Title Bar */}
      <div className="p-3 sm:p-4 border-b border-white/15 flex items-center justify-between gap-2 bg-[#1E5B4F]/30 backdrop-blur-sm">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#A57F2C] font-bold block drop-shadow-sm">
            TABLA DINÁMICA DE CAPTURA
          </span>
          <h3 className="text-sm sm:text-base font-bold text-white leading-tight drop-shadow">
            Catálogo de Equipamiento Médico ({EQUIPMENT_CATALOG.length} Preguntas)
          </h3>
        </div>
        <div className="text-xs text-amber-300/90 font-mono hidden sm:block">
          {officesCount} Consultorio(s) configurado(s)
        </div>
      </div>

      {/* Responsive Horizontal Scroll Container */}
      <div
        ref={tableContainerRef}
        className="overflow-x-auto custom-scrollbar max-h-[65vh] relative"
      >
        <table className="w-full border-collapse text-left text-xs min-w-[650px]">
          {/* Header row: Column titles */}
          <thead className="sticky top-0 z-30 bg-[#1E5B4F]/85 backdrop-blur-md border-b border-[#A57F2C]/40 shadow-md">
            <tr>
              <th className="sticky left-0 z-30 bg-[#1E5B4F]/90 backdrop-blur-md p-3 font-extrabold text-[#A57F2C] text-xs uppercase tracking-wider min-w-[200px] sm:min-w-[280px] border-r border-white/15">
                Pregunta / Equipo
              </th>
              {officesList.map((cNum) => (
                <th
                  key={`th-${cNum}`}
                  className="p-3 text-center font-bold text-white text-xs min-w-[120px] sm:min-w-[150px] border-r border-white/15 last:border-r-0"
                >
                  Consultorio {cNum}
                </th>
              ))}
            </tr>

            {/* Row 1: TURNO row */}
            <tr className="bg-[#1E5B4F]/50 border-b border-white/15">
              <td className="sticky left-0 z-30 bg-[#1E5B4F]/90 backdrop-blur-md p-2.5 font-bold text-amber-300 text-xs border-r border-white/15">
                <div className="flex items-center gap-1.5">
                  <Sunrise className="w-3.5 h-3.5 text-[#A57F2C]" />
                  <span>Turno</span>
                </div>
              </td>
              {officesList.map((cNum) => {
                const currentTurn = generalData.turns[cNum] || 'Matutino';
                return (
                  <td key={`turn-${cNum}`} className="p-2 text-center border-r border-white/15 last:border-r-0">
                    <div className="inline-flex rounded-full bg-[#1E5B4F]/60 p-1 border border-white/15 gap-1">
                      {turnOptions.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleSetTurn(cNum, t)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                            currentTurn === t
                              ? 'bg-[#A57F2C] text-black shadow-md font-bold'
                              : 'text-zinc-300 hover:text-white hover:bg-white/10'
                          }`}
                          title={`Asignar turno ${t} a consultorio ${cNum}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
          </thead>

          {/* Equipment Questions Rows */}
          <tbody className="divide-y divide-white/10">
            {EQUIPMENT_CATALOG.map((item, idx) => {
              // Check if all offices in this row have saved answers
              let allAnsweredInRow = true;
              for (const cNum of officesList) {
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
                      <span className="w-5 h-5 rounded-full bg-white/10 text-zinc-300 text-[10px] flex items-center justify-center flex-shrink-0 border border-white/10">
                        {item.id}
                      </span>
                      <span className="leading-snug">{item.name}</span>
                      {allAnsweredInRow && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 ml-auto" />
                      )}
                    </div>
                  </td>

                  {/* Office Cells */}
                  {officesList.map((cNum) => (
                    <QuestionCell
                      key={`cell-${cNum}-${item.id}`}
                      officeNumber={cNum}
                      question={item.name}
                      turn={generalData.turns[cNum] || 'Matutino'}
                    />
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
