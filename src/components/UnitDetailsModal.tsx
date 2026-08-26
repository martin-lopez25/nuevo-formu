import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext.tsx';
import { Building2, X, MapPin, Wifi, Users, Layers, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';

export const UnitDetailsModal: React.FC = () => {
  const {
    isDetailsModalOpen,
    setIsDetailsModalOpen,
    selectedUnit,
    generalData,
    stats,
    user
  } = useApp();

  if (!isDetailsModalOpen || !selectedUnit) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          className="relative max-w-lg w-full rounded-3xl p-6 sm:p-8 backdrop-blur-2xl bg-[#002F2A]/95 border border-[#A57F2C] shadow-2xl text-white space-y-5"
        >
          {/* Close button */}
          <button
            onClick={() => setIsDetailsModalOpen(false)}
            className="absolute top-4 right-4 text-white/60 hover:text-white p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-[#A57F2C]/20 border border-[#A57F2C]/40 flex items-center justify-center text-[#A57F2C]">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#A57F2C] font-bold block">
                EXPEDIENTE DE UNIDAD MÉDICA
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                Detalles de la Unidad
              </h3>
            </div>
          </div>

          {/* Data Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1">
              <span className="text-zinc-400 text-[10px] uppercase font-bold block">CLUES</span>
              <span className="font-mono text-sm font-extrabold text-[#A57F2C]">{selectedUnit.clues}</span>
            </div>

            <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1">
              <span className="text-zinc-400 text-[10px] uppercase font-bold block">Entidad Federativa</span>
              <span className="font-semibold text-white">{selectedUnit.entity}</span>
            </div>

            <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1 sm:col-span-2">
              <span className="text-zinc-400 text-[10px] uppercase font-bold block">Nombre de Unidad</span>
              <span className="font-bold text-white text-sm">{selectedUnit.name}</span>
            </div>

            <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1">
              <span className="text-zinc-400 text-[10px] uppercase font-bold block">Servicio de Internet</span>
              <span className={`font-bold ${
                generalData.hasInternet === 'SI' ? 'text-emerald-400' : generalData.hasInternet === 'NO' ? 'text-rose-400' : 'text-amber-400'
              }`}>
                {generalData.hasInternet}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1">
              <span className="text-zinc-400 text-[10px] uppercase font-bold block">Consultorios Configurados</span>
              <span className="font-mono text-sm font-bold text-amber-300">{generalData.configuredOffices}</span>
            </div>

            <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1">
              <span className="text-zinc-400 text-[10px] uppercase font-bold block">Consultorios Habilitados</span>
              <span className="font-mono text-sm font-bold text-emerald-400">{generalData.enabledOffices}</span>
            </div>

            <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1 sm:col-span-2">
              <span className="text-zinc-400 text-[10px] uppercase font-bold block">Progreso de Captura</span>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="font-bold text-amber-300">{stats.progressPercentage}% completado</span>
                <span className="text-zinc-300">{stats.answeredCount} de {stats.totalQuestions} campos</span>
              </div>
            </div>

            {user && (
              <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-1 sm:col-span-2">
                <span className="text-zinc-400 text-[10px] uppercase font-bold block">Capturista Registrado</span>
                <p className="font-semibold text-white">{user.name} ({user.email})</p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-white/10 flex justify-end">
            <button
              onClick={() => setIsDetailsModalOpen(false)}
              className="px-6 py-2.5 rounded-xl bg-[#A57F2C] hover:bg-[#b88f33] text-black font-bold text-xs shadow-md transition-colors"
            >
              CERRAR
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
