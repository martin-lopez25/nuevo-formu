import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext.tsx';
import { AlertTriangle, X } from 'lucide-react';

export const ZeroOfficesModal: React.FC = () => {
  const { isZeroOfficesModalOpen, setIsZeroOfficesModalOpen, handleConfirmZeroOffices } = useApp();

  if (!isZeroOfficesModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          className="relative max-w-md w-full rounded-3xl p-6 sm:p-7 backdrop-blur-2xl bg-[#611232]/95 border border-[#9B2247] shadow-2xl text-white text-center"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 mx-auto flex items-center justify-center mb-3 text-amber-300">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h3 className="text-lg font-bold text-white mb-2">
            Confirmación de 0 Consultorios
          </h3>

          <p className="text-xs sm:text-sm text-rose-100/90 mb-6 leading-relaxed">
            Esta unidad ya tiene respuestas capturadas. Al cambiar a 0 consultorios se eliminarán permanentemente todas sus respuestas de la base de datos.
            <br />
            <strong className="text-amber-200 mt-2 block font-semibold">Esta acción no se puede deshacer. ¿Desea continuar?</strong>
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsZeroOfficesModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors"
            >
              CANCELAR
            </button>
            <button
              type="button"
              onClick={handleConfirmZeroOffices}
              className="flex-1 py-2.5 rounded-xl bg-[#A57F2C] hover:bg-[#b88f33] text-black font-bold text-xs shadow-md transition-colors"
              id="btn-confirmar-cero-consultorios"
            >
              ELIMINAR RESPUESTAS
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
