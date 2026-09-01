import React, { useRef } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Wifi, WifiOff, RefreshCw, Building2, Home } from 'lucide-react';

interface NavbarProps {
  onSecretAccess: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSecretAccess }) => {
  const logoClickCount = useRef(0);
  const logoClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    activeSection,
    setActiveSection,
    isOnline,
    isSyncing,
    pendingSyncCount,
    triggerManualSync,
    selectedUnit,
  } = useApp();

  const handleLogoClick = () => {
    if (activeSection !== 'inicio') {
      logoClickCount.current = 0;
      if (logoClickTimer.current) clearTimeout(logoClickTimer.current);
      return;
    }

    logoClickCount.current += 1;
    if (logoClickTimer.current) clearTimeout(logoClickTimer.current);

    if (logoClickCount.current === 4) {
      logoClickCount.current = 0;
      onSecretAccess();
      return;
    }

    logoClickTimer.current = setTimeout(() => {
      logoClickCount.current = 0;
    }, 1800);
  };

  return (
    <header className="sticky top-0 z-40 bg-transparent text-white transition-all duration-300">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* Left: Home Button and Clean Typography */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSection('inicio')}
            className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 hover:border-[#A57F2C] text-white hover:text-[#A57F2C] transition-all flex items-center justify-center backdrop-blur-md shadow-sm cursor-pointer"
            title="Ir al Inicio"
            aria-label="Ir a Inicio"
            id="btn-nav-home"
          >
            <Home className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            type="button"
            onClick={handleLogoClick}
            className="cursor-default select-none"
            aria-label="IMSS Bienestar"
          >
            <img
              src="https://imssbienestar.gob.mx/assets/img/imb_b.svg"
              alt="IMSS Bienestar"
              className="h-8 sm:h-10 w-auto"
              draggable={false}
            />
          </button>
        </div>

        {/* Right: Connection & Status Indicators */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Unit Badge if inside questionnaire */}
          {selectedUnit && activeSection === 'formulario' && (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#611232]/70 border border-[#9B2247]/50 text-xs backdrop-blur-md">
              <Building2 className="w-3.5 h-3.5 text-[#A57F2C]" />
              <span className="font-mono text-amber-200 font-semibold">{selectedUnit.clues}</span>
              <span className="text-zinc-200 text-[11px] truncate max-w-[140px]">{selectedUnit.name}</span>
            </div>
          )}

          {/* Connection Status Indicator */}
          <div className="flex items-center gap-1.5">
            {isSyncing ? (
              <div 
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md animate-pulse"
                title="Sincronizando cambios pendientes con la nube"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline font-semibold">↻ SINCRONIZANDO</span>
              </div>
            ) : isOnline ? (
              <button
                onClick={triggerManualSync}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 backdrop-blur-md transition-colors cursor-pointer"
                title={pendingSyncCount > 0 ? `${pendingSyncCount} pendientes. Clic para sincronizar` : 'Servidor en línea'}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span className="font-semibold">● CONECTADO</span>
                {pendingSyncCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-black font-bold text-[10px]">
                    {pendingSyncCount}
                  </span>
                )}
              </button>
            ) : (
              <button
                onClick={triggerManualSync}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 backdrop-blur-md transition-colors cursor-pointer"
                title="Sin conexión. Clic para reintentar sincronizar"
              >
                <WifiOff className="w-3.5 h-3.5" />
                <span className="font-semibold">● SIN CONEXIÓN</span>
                {pendingSyncCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-black font-bold text-[10px]">
                    {pendingSyncCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
