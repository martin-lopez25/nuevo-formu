import React, { useState, useRef } from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { ImageFragmentsTransition } from './components/ImageFragmentsTransition.tsx';
import { Toasts } from './components/Toasts.tsx';
import { Section1Hero } from './components/Section1Hero.tsx';
import { Section2Instructions } from './components/Section2Instructions.tsx';
import { Section2InstructionsVisuals } from './components/Section2InstructionsVisuals.tsx';
import { Section3EntitySelector } from './components/Section3EntitySelector.tsx';
import { UserModal } from './components/UserModal.tsx';
import { UnitSelector } from './components/UnitSelector.tsx';
import { GeneralQuestions } from './components/GeneralQuestions.tsx';
import { QuestionnaireTable } from './components/QuestionnaireTable.tsx';
import { UnitDetailsModal } from './components/UnitDetailsModal.tsx';
import { ZeroOfficesModal } from './components/ZeroOfficesModal.tsx';
import { ConflictModal } from './components/ConflictModal.tsx';
import { SecretAdminModal } from './components/SecretAdminModal.tsx';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Building2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  MapPin
} from 'lucide-react';

const MainAppContent: React.FC = () => {
  const {
    activeSection,
    setActiveSection,
    selectedEntity,
    setSelectedEntity,
    user,
    selectedUnit,
    isUnitLocked,
    handleUnlockUnit,
    setIsDetailsModalOpen,
    resetQuestionnaireState,
    handleChangeEntity
  } = useApp();

  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Smooth auto-scroll to question row inside table
  const handleScrollToQuestion = (questionName: string) => {
    const rowId = `row-question-${encodeURIComponent(questionName)}`;
    const el = document.getElementById(rowId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-amber-400');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-amber-400');
      }, 2500);
    }
  };

  const handleEntityChosen = (entityName?: string) => {
    const currentEnt = entityName || selectedEntity;
    // If user is not yet registered or entity changed, open user modal
    if (!user || (currentEnt && user.entity !== currentEnt)) {
      setIsUserModalOpen(true);
    }
  };

  return (
    <div className="relative min-h-screen bg-transparent text-zinc-100 font-sans selection:bg-[#A57F2C] selection:text-black flex flex-col justify-between overflow-x-hidden">
      {/* Dynamic Ambient Background & Fragmented Particles */}
      <ImageFragmentsTransition section={activeSection} />

      {/* Main Global Header */}
      <Navbar onSecretAccess={() => setIsAdminModalOpen(true)} />

      {/* Main Dynamic View Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {/* Section 1: Portada */}
          {activeSection === 'inicio' && (
            <motion.div
              key="sec-inicio"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="w-full"
            >
              <Section1Hero />
            </motion.div>
          )}

          {/* Section 2: Instrucciones (Parte 1) */}
          {activeSection === 'instrucciones' && (
            <motion.div
              key="sec-instrucciones"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="w-full"
            >
              <Section2Instructions />
            </motion.div>
          )}

          {/* Section 2.2: Instrucciones - Estados Visuales (Parte 2) */}
          {activeSection === 'instrucciones_2' && (
            <motion.div
              key="sec-instrucciones-visuals"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="w-full"
            >
              <Section2InstructionsVisuals />
            </motion.div>
          )}

          {/* Section 3: Formulario */}
          {activeSection === 'formulario' && (
            <motion.div
              key="sec-formulario"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.5 }}
              className="w-full space-y-6"
            >
              {/* If no entity selected yet, show entity grid */}
              {!selectedEntity ? (
                <Section3EntitySelector onEntitySelected={handleEntityChosen} />
              ) : (
                /* Entity is selected: Show Form Workflow */
                <div className="space-y-5">
                  {/* Top Bar: Active Entity & Capturista Info Card (Transparent Glass) */}
                  <div className="rounded-3xl backdrop-blur-md bg-[#002F2A]/75 border border-white/25 p-4 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.5)] flex flex-wrap items-center justify-between gap-3 text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-transparent border border-[#A57F2C]/60 flex items-center justify-center text-[#A57F2C] font-bold backdrop-blur-sm shadow-sm">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-[#A57F2C]">
                            ENTIDAD ACTIVA
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-amber-300 border border-[#A57F2C]/50 uppercase font-semibold">
                            {selectedEntity}
                          </span>
                        </div>
                        <h2 className="text-base sm:text-lg font-bold text-white leading-tight drop-shadow">
                          Cuestionario de Equipamiento — {selectedEntity}
                        </h2>
                      </div>
                    </div>

                    {/* User info snippet */}
                    {user ? (
                      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-transparent border border-white/20 text-xs backdrop-blur-sm">
                        <User className="w-4 h-4 text-[#A57F2C]" />
                        <div>
                          <p className="font-semibold text-zinc-100">{user.name}</p>
                          <p className="text-[11px] text-zinc-400">{user.email}</p>
                        </div>
                        <button
                          onClick={() => setIsUserModalOpen(true)}
                          className="ml-2 text-[10px] text-amber-300 hover:text-amber-200 underline"
                        >
                          Editar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsUserModalOpen(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#9B2247] hover:bg-[#b02852] text-white text-xs font-bold shadow-md transition-colors"
                      >
                        Registrar Usuario
                      </button>
                    )}

                    {/* Switch entity button */}
                    <button
                      onClick={handleChangeEntity}
                      className="px-3.5 py-1.5 rounded-full bg-transparent hover:bg-white/10 border border-white/25 text-xs text-zinc-200 hover:text-white transition-colors flex items-center gap-1.5 backdrop-blur-sm cursor-pointer shadow-sm"
                      id="btn-cambiar-estado"
                      title="Seleccionar otra entidad federativa"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#A57F2C]" />
                      <span>Cambiar Estado</span>
                    </button>
                  </div>

                  {/* Unit Selector Component */}
                  <UnitSelector
                    onUnlockRequest={handleUnlockUnit}
                    onOpenDetails={() => setIsDetailsModalOpen(true)}
                  />

                  {/* If Unit is Selected & Locked: Show General Questions & Dynamic Questionnaire Table */}
                  {selectedUnit && isUnitLocked && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="space-y-5"
                    >
                      {/* General Questions & Office Configurator */}
                      <GeneralQuestions onScrollToQuestion={handleScrollToQuestion} />

                      {/* Dynamic Equipment Table */}
                      <QuestionnaireTable tableContainerRef={tableContainerRef} />
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Global Modals */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
      />
      <UnitDetailsModal />
      <ZeroOfficesModal />
      <ConflictModal />
      <SecretAdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />

      {/* Accessible Toast Notifications */}
      <Toasts />

      {/* Institutional Footer (Unboxed Clean Typography) */}
      <footer className="relative z-10 py-4 px-4 text-center text-xs text-zinc-200 drop-shadow flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto w-full gap-2 select-none">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#A57F2C]" />
          <span className="font-medium text-white">Gobierno de México — Servicios de Salud IMSS-BIENESTAR</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-zinc-300">
          <span>Censo Nacional de Equipamiento Clínico</span>
          <span>•</span>
          <span className="font-mono text-[#A57F2C] font-semibold">Versión 2.4.0-PROD</span>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
