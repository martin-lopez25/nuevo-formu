import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext.tsx';
import {
  Layers,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

export const Section2Instructions: React.FC = () => {
  const { setActiveSection } = useApp();

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
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest text-black font-bold block drop-shadow-sm">
                  GUÍA DE OPERACIÓN
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-black border border-[#A57F2C]/50 uppercase font-semibold">
                  PARTE 1 DE 2
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-black tracking-tight drop-shadow">
                Flujo de Captura y Registro
              </h2>
            </div>
          </div>

          <button
            onClick={() => setActiveSection('inicio')}
            className="flex items-center gap-1.5 text-xs text-black hover:text-black px-3.5 py-1.5 rounded-full bg-white/30 hover:bg-white/60 border border-black/20 transition-colors backdrop-blur-sm cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Volver a Inicio</span>
          </button>
        </div>

        {/* Scrollable Instruction Body (Steps 1 to 6) */}
        <div className="overflow-y-auto pr-2 space-y-4 text-sm text-black custom-scrollbar flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/35 border border-black/15 hover:border-black/30 transition-colors backdrop-blur-sm shadow-sm">
              <h3 className="font-bold text-black flex items-center gap-2 mb-1.5">
                <span className="w-6 h-6 rounded-full bg-[#A57F2C] text-black font-extrabold text-xs flex items-center justify-center shadow">1</span>
                Seleccionar Estado
              </h3>
              <p className="text-xs text-black leading-relaxed">
                Haga clic en el botón del estado correspondiente a censar para comenzar el registro de equipamiento.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/35 border border-black/15 hover:border-black/30 transition-colors backdrop-blur-sm shadow-sm">
              <h3 className="font-bold text-black flex items-center gap-2 mb-1.5">
                <span className="w-6 h-6 rounded-full bg-[#A57F2C] text-black font-extrabold text-xs flex items-center justify-center shadow">2</span>
                Registrar Datos del Usuario
              </h3>
              <p className="text-xs text-black leading-relaxed">
                Complete el formulario con nombre completo y correo electrónico institucional del capturista.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/35 border border-black/15 hover:border-black/30 transition-colors backdrop-blur-sm shadow-sm">
              <h3 className="font-bold text-black flex items-center gap-2 mb-1.5">
                <span className="w-6 h-6 rounded-full bg-[#A57F2C] text-black font-extrabold text-xs flex items-center justify-center shadow">3</span>
                Seleccionar Unidad Médica
              </h3>
              <p className="text-xs text-black leading-relaxed">
                Elija la unidad médica específica que desea registrar en el selector desplegable con búsqueda CLUES o nombre.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/35 border border-black/15 hover:border-black/30 transition-colors backdrop-blur-sm shadow-sm">
              <h3 className="font-bold text-black flex items-center gap-2 mb-1.5">
                <span className="w-6 h-6 rounded-full bg-[#A57F2C] text-black font-extrabold text-xs flex items-center justify-center shadow">4</span>
                Configurar Consultorios
              </h3>
              <p className="text-xs text-black leading-relaxed">
                Ingrese el número de consultorios que tiene la unidad (0 - 20) y presione &quot;Aplicar&quot; para generar la matriz.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/35 border border-black/15 hover:border-black/30 transition-colors backdrop-blur-sm shadow-sm">
              <h3 className="font-bold text-black flex items-center gap-2 mb-1.5">
                <span className="w-6 h-6 rounded-full bg-[#A57F2C] text-black font-extrabold text-xs flex items-center justify-center shadow">5</span>
                Preguntas Individuales
              </h3>
              <p className="text-xs text-black leading-relaxed">
                Responda las preguntas que no dependen de consultorios:
                <br />• <strong>Internet:</strong> Seleccione SI o NO.
                <br />• <strong>Consultorios Generales Habilitados:</strong> Ingrese el número y presione Enter.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/35 border border-black/15 hover:border-black/30 transition-colors backdrop-blur-sm shadow-sm">
              <h3 className="font-bold text-black flex items-center gap-2 mb-1.5">
                <span className="w-6 h-6 rounded-full bg-[#A57F2C] text-black font-extrabold text-xs flex items-center justify-center shadow">6</span>
                Llenar Cuestionario
              </h3>
              <p className="text-xs text-black leading-relaxed">
                Para cada consultorio complete:
                <br />• <strong>Turno:</strong> Matutino, Vespertino o Ambos.
                <br />• <strong>Cantidad:</strong> Haga clic en la celda, ingrese el valor y presione Enter.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-black/15 flex items-center justify-between gap-3 mt-2">
          <button
            onClick={() => setActiveSection('inicio')}
            className="px-5 py-2.5 rounded-full bg-white/30 hover:bg-white/60 text-black text-sm font-semibold border border-black/20 transition-colors flex items-center gap-2 backdrop-blur-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ANTERIOR</span>
          </button>

          <button
            onClick={() => setActiveSection('instrucciones_2')}
            className="px-7 py-2.5 rounded-full bg-[#A57F2C] hover:bg-[#b88f33] text-black text-sm sm:text-base font-extrabold shadow-[0_8px_20px_rgba(165,127,44,0.4)] transition-all flex items-center gap-2 cursor-pointer"
            id="btn-siguiente-instrucciones"
          >
            <span>SIGUIENTE</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
