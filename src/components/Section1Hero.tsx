import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext.tsx';
import { ArrowRight, ShieldCheck, Stethoscope, FileSpreadsheet } from 'lucide-react';

export const Section1Hero: React.FC = () => {
  const { setActiveSection } = useApp();

  return (
    <div className="relative min-h-[calc(100vh-64px)] w-full flex items-center justify-center p-4 sm:p-6 lg:p-12 overflow-hidden">
      {/* Centered Transparent Glassmorphism Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-w-2xl w-full mx-auto rounded-3xl p-6 sm:p-10 lg:p-12 backdrop-blur-md bg-transparent border border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.5)] text-center text-white flex flex-col items-center"
      >
        {/* IMSS-BIENESTAR Official Logo */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-6 flex flex-col items-center gap-3"
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/b/be/IMSS_Bienestar.svg?utm_source=es.wikipedia.org&utm_campaign=index&utm_content=original"
            alt="IMSS Bienestar"
            className="w-40 sm:w-48 h-auto drop-shadow-md"
          />

          <div className="space-y-1">
            <span className="text-xs sm:text-sm font-semibold tracking-[0.25em] text-[#A57F2C] uppercase block drop-shadow-sm">
              SERVICIOS DE SALUD
            </span>
          </div>
        </motion.div>

        {/* Main Title */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="space-y-4 max-w-xl"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight uppercase font-sans drop-shadow-md">
            CUESTIONARIO DE EQUIPAMIENTO POR UNIDAD MÉDICA
          </h2>
          <p className="text-sm sm:text-base text-zinc-100 font-normal leading-relaxed max-w-lg mx-auto drop-shadow">
            Plataforma institucional de registro y validación censal de equipamiento clínico, mobiliario e infraestructura para unidades de atención médica.
          </p>
        </motion.div>

        {/* Quick Highlights / Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="grid grid-cols-3 gap-2 sm:gap-4 my-8 w-full max-w-md pt-4 border-t border-white/20 text-xs text-zinc-100"
        >
          <div className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-transparent border border-white/20 backdrop-blur-sm">
            <ShieldCheck className="w-5 h-5 text-[#A57F2C]" />
            <span className="font-medium text-center">Censo Oficial</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-transparent border border-white/20 backdrop-blur-sm">
            <Stethoscope className="w-5 h-5 text-[#A57F2C]" />
            <span className="font-medium text-center">44 Equipos</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-transparent border border-white/20 backdrop-blur-sm">
            <FileSpreadsheet className="w-5 h-5 text-[#A57F2C]" />
            <span className="font-medium text-center">Guardado Nube</span>
          </div>
        </motion.div>

        {/* CTA Button: COMENZAR */}
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          whileHover={{ scale: 1.04, backgroundColor: '#c29737' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveSection('instrucciones')}
          className="px-8 py-3.5 rounded-full bg-[#A57F2C] text-black font-bold text-base sm:text-lg shadow-[0_10px_25px_rgba(165,127,44,0.4)] flex items-center gap-3 group transition-all duration-300"
          id="btn-comenzar-portada"
        >
          <span>COMENZAR</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </motion.div>
    </div>
  );
};
