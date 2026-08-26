import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext.tsx';
import { MEXICAN_ENTITIES } from '../data/mexicoEntities.ts';
import { MapPin, Search, ChevronRight, Check } from 'lucide-react';

interface EntitySelectorProps {
  onEntitySelected: (entityName: string) => void;
}

export const Section3EntitySelector: React.FC<EntitySelectorProps> = ({ onEntitySelected }) => {
  const { selectedEntity, handleSelectEntity } = useApp();
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredEntities = MEXICAN_ENTITIES.filter((ent) =>
    ent.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePick = (name: string) => {
    handleSelectEntity(name);
    onEntitySelected(name);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <span className="text-xs uppercase tracking-widest text-[#A57F2C] font-bold block drop-shadow-sm">
          PASO 1
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow">
          Seleccione una entidad federativa
        </h2>
        <p className="text-xs sm:text-sm text-zinc-100 max-w-md mx-auto drop-shadow">
          Elija el estado de la República Mexicana correspondiente a las unidades médicas a censar.
        </p>

        {/* Filter Search Input */}
        <div className="max-w-md mx-auto relative pt-2">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar entidad federativa..."
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-transparent border border-white/25 text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 backdrop-blur-md transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Grid of 32 Entities with Transparent Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar p-1">
        {filteredEntities.map((ent, idx) => {
          const isSelected = selectedEntity === ent.name;

          return (
            <motion.button
              key={ent.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.015, duration: 0.3 }}
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(0, 47, 42, 0.9)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePick(ent.name)}
              className={`group text-left p-3.5 rounded-2xl backdrop-blur-md border transition-all duration-200 flex items-center justify-between gap-3 shadow-md ${
                isSelected
                  ? 'bg-[#002F2A]/75 border-[#A57F2C] ring-2 ring-[#A57F2C]/60 text-white shadow-lg'
                  : 'bg-[#002F2A]/75 border-white/20 hover:border-[#A57F2C]/60 text-zinc-100'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                    isSelected
                      ? 'bg-[#A57F2C] text-black'
                      : 'bg-white/10 text-[#A57F2C] group-hover:bg-[#A57F2C] group-hover:text-black border border-white/20'
                  }`}
                >
                  {ent.code}
                </div>
                <div className="truncate">
                  <span className="text-xs sm:text-sm font-semibold block truncate">
                    {ent.name}
                  </span>
                  <span className="text-[10px] text-zinc-300 block">
                    {ent.totalUnits ? `${ent.totalUnits} unidades registradas` : 'Censo activo'}
                  </span>
                </div>
              </div>

              <div className="flex-shrink-0">
                {isSelected ? (
                  <Check className="w-4 h-4 text-[#A57F2C]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/90 group-hover:translate-x-0.5 transition-all" />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
