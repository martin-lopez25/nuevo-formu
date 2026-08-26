import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, RefreshCw, X, AlertTriangle } from 'lucide-react';

export const Toasts: React.FC = () => {
  const { toasts, removeToast } = useApp();

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm sm:max-w-md w-full px-3 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          let bg = 'bg-[#002F2A]/95 border-emerald-500/50 text-emerald-100';
          let Icon = Info;
          let iconColor = 'text-emerald-400';

          if (toast.type === 'success') {
            bg = 'bg-[#002F2A]/95 border-[#A57F2C] text-emerald-50';
            Icon = CheckCircle2;
            iconColor = 'text-[#A57F2C]';
          } else if (toast.type === 'error') {
            bg = 'bg-[#611232]/95 border-rose-500 text-rose-100';
            Icon = AlertCircle;
            iconColor = 'text-rose-400';
          } else if (toast.type === 'warning') {
            bg = 'bg-amber-950/95 border-amber-500 text-amber-100';
            Icon = AlertTriangle;
            iconColor = 'text-amber-400';
          } else if (toast.type === 'sync') {
            bg = 'bg-[#002F2A]/95 border-blue-400 text-blue-100';
            Icon = RefreshCw;
            iconColor = 'text-blue-400 animate-spin';
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ duration: 0.25 }}
              className={`pointer-events-auto rounded-xl p-3.5 shadow-2xl backdrop-blur-md border flex items-start gap-3 ${bg}`}
              role="alert"
            >
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold tracking-tight leading-snug">{toast.title}</p>
                {toast.description && (
                  <p className="text-xs mt-1 text-white/80 leading-relaxed font-normal">{toast.description}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-white/60 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
                aria-label="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
