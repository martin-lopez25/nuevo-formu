import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext.tsx';
import { MedicalUnit } from '../types.ts';
import { searchUnits, fetchUnitsByEntity } from '../services/api.ts';
import {
  Building2,
  Search,
  Lock,
  Unlock,
  CheckCircle2,
  Info,
  MapPin,
  RefreshCw,
  Eye,
  AlertTriangle
} from 'lucide-react';

interface UnitSelectorProps {
  onUnlockRequest: () => void;
  onOpenDetails: () => void;
}

export const UnitSelector: React.FC<UnitSelectorProps> = ({ onUnlockRequest, onOpenDetails }) => {
  const {
    selectedEntity,
    selectedUnit,
    isUnitLocked,
    handleSelectUnit,
    pendingSyncCount
  } = useApp();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [unitsList, setUnitsList] = useState<MedicalUnit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Debounce search input to avoid hitting server on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch or filter units when entity or debounced query changes
  useEffect(() => {
    let isMounted = true;
    if (!selectedEntity) return;

    setIsLoading(true);
    if (debouncedQuery.trim()) {
      searchUnits(debouncedQuery, selectedEntity)
        .then((res) => {
          if (isMounted) setUnitsList(res);
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    } else {
      fetchUnitsByEntity(selectedEntity)
        .then((res) => {
          if (isMounted) setUnitsList(res);
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [selectedEntity, debouncedQuery]);

  const handlePickUnit = async (u: MedicalUnit) => {
    setIsDropdownOpen(false);
    setSearchQuery('');
    await handleSelectUnit(u);
  };

  return (
    <div className="w-full rounded-3xl backdrop-blur-md bg-[#002F2A]/75 border border-white/25 p-4 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.5)] text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/20 pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-transparent border border-[#A57F2C]/60 flex items-center justify-center text-[#A57F2C] backdrop-blur-sm shadow-sm">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-widest text-[#A57F2C] font-bold block drop-shadow-sm">
              PASO 3 — UNIDAD MÉDICA
            </span>
            <h3 className="text-sm sm:text-base font-bold text-white leading-tight drop-shadow">
              {isUnitLocked && selectedUnit ? 'Unidad Médica Seleccionada' : 'Seleccionar Unidad Médica'}
            </h3>
          </div>
        </div>

        {/* Action Controls when unit is selected */}
        {selectedUnit && (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenDetails}
              className="px-3 py-1.5 rounded-full bg-transparent hover:bg-white/10 border border-white/25 text-xs font-semibold text-zinc-100 transition-colors flex items-center gap-1.5 backdrop-blur-sm"
              id="btn-ver-detalles"
            >
              <Eye className="w-3.5 h-3.5 text-[#A57F2C]" />
              <span>VER DETALLES</span>
            </button>

            {isUnitLocked ? (
              <button
                onClick={onUnlockRequest}
                className="px-3.5 py-1.5 rounded-full bg-[#611232]/90 hover:bg-[#7b173f] border border-[#9B2247] text-xs font-bold text-white transition-colors flex items-center gap-1.5 shadow-md backdrop-blur-sm"
                id="btn-desbloquear-unidad"
                title="Cambiar de unidad médica"
              >
                <Lock className="w-3.5 h-3.5 text-amber-300" />
                <span>CAMBIAR UNIDAD</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 text-xs text-white font-medium px-2.5 py-1 bg-white/10 rounded-full border border-white/20 backdrop-blur-sm">
                <Unlock className="w-3.5 h-3.5 text-[#A57F2C]" />
                <span>Modo Selección</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* When Locked: Display current unit summary */}
      {isUnitLocked && selectedUnit ? (
        <div className="p-3.5 rounded-xl bg-black/40 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs sm:text-sm font-extrabold text-[#A57F2C] px-2 py-0.5 rounded bg-[#A57F2C]/10 border border-[#A57F2C]/30">
                CLUES: {selectedUnit.clues}
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-bold text-white tracking-wide">
              {selectedUnit.name}
            </h4>
            <div className="flex items-center gap-3 text-xs text-zinc-300">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-400" />
                {selectedUnit.entity}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-400/50 text-xs text-emerald-300 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Unidad Confirmada</span>
            </div>
          </div>
        </div>
      ) : (
        /* When Unlocked: Search & Autocomplete input */
        <div className="space-y-2 relative">
          <div className="relative">
            <Search className="w-4 h-4 text-emerald-400/70 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Escriba la CLUES o el nombre de la unidad..."
              className="w-full pl-10 pr-10 py-3 rounded-xl bg-black/40 border border-white/20 text-white placeholder-white/40 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-all font-sans"
            />
            {isLoading && (
              <RefreshCw className="w-4 h-4 text-[#A57F2C] animate-spin absolute right-3.5 top-3.5" />
            )}
          </div>

          {/* Results Dropdown */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl bg-[#002F2A] border border-[#A57F2C]/50 shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar"
              >
                {unitsList.length > 0 ? (
                  <div className="p-1 space-y-1">
                    {unitsList.map((u) => (
                      <button
                        key={u.clues}
                        onClick={() => handlePickUnit(u)}
                        className="w-full text-left p-2.5 rounded-lg hover:bg-emerald-900/60 transition-colors flex flex-col gap-0.5 group"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-[#A57F2C] group-hover:text-amber-200">
                            {u.clues}
                          </span>
                          <span className="text-[10px] text-zinc-300 px-1.5 py-0.5 rounded bg-white/10">
                            {u.category}
                          </span>
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-white group-hover:text-emerald-200">
                          {u.name}
                        </span>
                        <span className="text-[11px] text-emerald-300/70">
                          {u.entity} {u.municipality ? `— ${u.municipality}` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-zinc-300">
                    No se encontraron unidades médicas con ese criterio para {selectedEntity}.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
