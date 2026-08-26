import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext.tsx';
import { AlertCircle, ArrowLeftRight, Check, X } from 'lucide-react';

export const ConflictModal: React.FC = () => {
  const { conflictData, setConflictData } = useApp();

  if (!conflictData) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          className="relative max-w-md w-full rounded-3xl p-6 backdrop-blur-2xl bg-[#002F2A]/95 border border-amber-400 shadow-2xl text-white text-center space-y-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 mx-auto flex items-center justify-center text-amber-300">
            <ArrowLeftRight className="w-6 h-6" />
          </div>

          <h3 className="text-lg font-bold text-white leading-tight">
            Conflicto de Versión Detectado
          </h3>

          <p className="text-xs text-zinc-200 leading-relaxed">
            Este dato fue modificado recientemente en el servidor. Seleccione qué versión desea conservar para <strong className="text-amber-300">{conflictData.question} (C{conflictData.officeNumber})</strong>:
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs text-left">
            <button
              onClick={() => {
                conflictData.onResolve('local');
                setConflictData(null);
              }}
              className="p-3.5 rounded-xl bg-black/50 border border-white/20 hover:border-emerald-400 transition-all flex flex-col gap-1 group"
            >
              <span className="text-[10px] uppercase font-bold text-zinc-400 group-hover:text-emerald-300">
                Versión Local
              </span>
              <span className="font-mono text-xl font-bold text-emerald-400">
                {conflictData.localValue ?? 'PENDIENTE'}
              </span>
              <span className="text-[10px] text-zinc-500">{conflictData.localDate}</span>
              <div className="mt-2 py-1 px-2 rounded bg-white/10 text-center font-bold text-[10px] text-white">
                CONSERVAR LOCAL
              </div>
            </button>

            <button
              onClick={() => {
                conflictData.onResolve('server');
                setConflictData(null);
              }}
              className="p-3.5 rounded-xl bg-black/50 border border-white/20 hover:border-amber-400 transition-all flex flex-col gap-1 group"
            >
              <span className="text-[10px] uppercase font-bold text-zinc-400 group-hover:text-amber-300">
                Versión Servidor
              </span>
              <span className="font-mono text-xl font-bold text-amber-400">
                {conflictData.serverValue ?? 'PENDIENTE'}
              </span>
              <span className="text-[10px] text-zinc-500">{conflictData.serverDate}</span>
              <div className="mt-2 py-1 px-2 rounded bg-[#A57F2C] text-black text-center font-bold text-[10px]">
                CONSERVAR SERVIDOR
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
