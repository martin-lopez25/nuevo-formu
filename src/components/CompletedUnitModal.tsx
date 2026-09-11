import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Building2 } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

export const CompletedUnitModal: React.FC = () => {
  const { completedUnitName, setCompletedUnitName } = useApp();

  useEffect(() => {
    if (!completedUnitName) return;
    const timeout = window.setTimeout(() => setCompletedUnitName(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [completedUnitName, setCompletedUnitName]);

  if (!completedUnitName) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#002F2A]/70 p-4 backdrop-blur-md"
    >
      <motion.div
        role="status"
        aria-live="assertive"
        aria-labelledby="completed-unit-title"
        initial={{ opacity: 0, scale: 0.82, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border-2 border-[#A57F2C] bg-emerald-950/85 text-center text-white shadow-[0_24px_90px_rgba(0,0,0,0.65)]"
      >
        <div className="p-8 sm:p-12">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-300 bg-emerald-500 text-emerald-950 shadow-[0_0_35px_rgba(52,211,153,0.55)]">
            <CheckCircle2 className="h-12 w-12" strokeWidth={2.5} />
          </div>
          <p className="mb-2 text-sm font-bold uppercase text-emerald-200">Captura al 100%</p>
          <h2 id="completed-unit-title" className="text-3xl font-extrabold sm:text-5xl">
            UNIDAD COMPLETADA
          </h2>
          <div className="mx-auto mt-6 flex max-w-lg items-center justify-center gap-2 border-t border-white/20 pt-5 text-amber-200">
            <Building2 className="h-5 w-5 shrink-0" />
            <p className="text-sm font-bold sm:text-base">{completedUnitName}</p>
          </div>
        </div>
        <div className="h-2 bg-black/30">
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: 0 }}
            transition={{ duration: 5, ease: 'linear' }}
            className="h-full bg-[#A57F2C]"
          />
        </div>
      </motion.div>
    </motion.div>
  );
};