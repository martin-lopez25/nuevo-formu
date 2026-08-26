import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext.tsx';
import {
  Sparkles,
  HelpCircle,
  Clock,
  Info,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

export const Section2InstructionsVisuals: React.FC = () => {
  const { setActiveSection, resetQuestionnaireState } = useApp();

  const handleEnterForm = () => {
    resetQuestionnaireState();
    setActiveSection('formulario');
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] w-full flex items-center justify-center p-3 sm:p-6 lg:p-10 overflow-hidden">
      {/* Centered Transparent Glassmorphism Card */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-w-4xl w-full mx-auto rounded-3xl p-5 sm:p-8 lg:p-10 backdrop-blur-xl bg-white/75 border border-white/80 shadow-[0_25px_60px_rgba(0,0,0,0.35)] text-black flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/15 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-transparent border border-[#A57F2C]/60 flex items-center justify-center text-[#A57F2C] backdrop-blur-sm shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest text-black font-bold block drop-shadow-sm">
                  GUÍA DE OPERACIÓN
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-black border border-[#A57F2C]/50 uppercase font-semibold">
                  PARTE 2 DE 2
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-black tracking-tight drop-shadow">
                Estados Visuales y Recomendaciones
              </h2>
            </div>
          </div>

          <button
            onClick={() => setActiveSection('instrucciones')}
            className="flex items-center gap-1.5 text-xs text-black hover:text-black px-3.5 py-1.5 rounded-full bg-white/30 hover:bg-white/60 border border-black/20 transition-colors backdrop-blur-sm cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Paso Anterior</span>
          </button>
        </div>

        {/* Scrollable Instruction Body (Visual States downwards) */}
        <div className="overflow-y-auto pr-2 space-y-5 text-sm text-black custom-scrollbar flex-1">
          {/* Color Legend (Estados Visuales) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/35 border border-black/15 space-y-3.5 backdrop-blur-sm shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-black flex items-center gap-2 drop-shadow-sm">
              <Sparkles className="w-4 h-4" />
              Estados Visuales de las Celdas en el Cuestionario
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-white/60 border border-emerald-600/60 flex flex-col gap-1 backdrop-blur-sm shadow-inner">
                <span className="font-bold text-black">VERDE</span>
                <span className="text-[11px] text-black leading-snug">Valor &gt; 0 registrado</span>
              </div>
              <div className="p-3 rounded-xl bg-white/60 border border-blue-600/60 flex flex-col gap-1 backdrop-blur-sm shadow-inner">
                <span className="font-bold text-black">AZUL</span>
                <span className="text-[11px] text-black leading-snug">Valor 0 registrado</span>
              </div>
              <div className="p-3 rounded-xl bg-white/60 border border-rose-600/60 flex flex-col gap-1 backdrop-blur-sm shadow-inner">
                <span className="font-bold text-black">ROJO</span>
                <span className="text-[11px] text-black leading-snug">Campo pendiente</span>
              </div>
              <div className="p-3 rounded-xl bg-white/60 border border-[#A57F2C] flex flex-col gap-1 backdrop-blur-sm shadow-inner">
                <span className="font-bold text-black flex items-center gap-1">
                  DORADO <span>✓</span>
                </span>
                <span className="text-[11px] text-black leading-snug">Guardado en la nube</span>
              </div>
              <div className="p-3 rounded-xl bg-white/60 border-2 border-emerald-600 flex flex-col gap-1 col-span-2 sm:col-span-1 backdrop-blur-sm shadow-inner">
                <span className="font-bold text-black">FILA RESALTADA</span>
                <span className="text-[11px] text-black leading-snug">Unidad guardada en BD</span>
              </div>
            </div>
          </div>

          {/* 7. Guardado Automático & 8. Ver Detalles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/35 border border-black/15 backdrop-blur-sm shadow-sm">
              <h4 className="font-bold text-black text-xs mb-1.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#A57F2C]" />
                7. Guardado Automático
              </h4>
              <p className="text-xs text-black leading-relaxed">
                El turno se guarda automáticamente al hacer clic en Matutino, Vespertino o Ambos. Cada pregunta se guarda automáticamente al presionar Enter en el teclado o al salir de la celda.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/35 border border-black/15 backdrop-blur-sm shadow-sm">
              <h4 className="font-bold text-black text-xs mb-1.5 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#A57F2C]" />
                8. Ver Detalles
              </h4>
              <p className="text-xs text-black leading-relaxed">
                Haga clic en &quot;Ver detalles&quot; en cualquier momento para consultar el resumen administrativo de la unidad médica activa y su porcentaje de llenado.
              </p>
            </div>
          </div>

          {/* Tips / Consejos */}
          <div className="p-4 rounded-2xl bg-white/35 border border-black/15 space-y-2 backdrop-blur-sm shadow-sm">
            <h4 className="font-bold text-black text-xs uppercase tracking-wider flex items-center gap-1.5 drop-shadow-sm">
              <HelpCircle className="w-4 h-4" />
              Consejos de Captura
            </h4>
            <ul className="text-xs text-black space-y-1.5 list-disc list-inside leading-relaxed">
              <li>Use solamente números enteros para las cantidades.</li>
              <li>El 0 es un valor válido (se marcará en color azul).</li>
              <li>Cada campo se guarda automáticamente al presionar Enter.</li>
              <li>El progreso local se resguarda en el navegador incluso si se interrumpe la conexión.</li>
              <li>Pase el cursor sobre cualquier celda para ver la descripción completa de la pregunta.</li>
              <li>Busque el icono ✓ para confirmar la sincronización con el servidor central.</li>
            </ul>
          </div>

          {/* Soporte */}
          <div className="text-center text-xs text-black py-1 drop-shadow">
            Si tiene dudas o problemas técnicos, contacte a la mesa de soporte del Censo de Equipamiento IMSS-BIENESTAR.
          </div>
        </div>

        {/* Footer Actions - ONLY HERE APPEARS ENTRAR AL FORMULARIO */}
        <div className="pt-4 border-t border-black/15 flex items-center justify-between gap-3 mt-2">
          <button
            onClick={() => setActiveSection('instrucciones')}
            className="px-5 py-2.5 rounded-full bg-white/30 hover:bg-white/60 text-black text-sm font-semibold border border-black/20 transition-colors flex items-center gap-2 backdrop-blur-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ANTERIOR</span>
          </button>

          <button
            onClick={handleEnterForm}
            className="px-7 py-2.5 rounded-full bg-[#A57F2C] hover:bg-[#b88f33] text-black text-sm sm:text-base font-extrabold shadow-[0_8px_20px_rgba(165,127,44,0.4)] transition-all flex items-center gap-2 cursor-pointer"
            id="btn-entrar-formulario"
          >
            <span>ENTRAR AL FORMULARIO</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
