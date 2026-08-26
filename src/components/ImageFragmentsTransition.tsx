import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppSection } from '../context/AppContext.tsx';

interface ImageFragmentsTransitionProps {
  section: AppSection;
}

// Background photographic image URLs for each application section:
// 1. Inicio: Modern Hospital & Clinic Exterior Architectural Facade
// 2. Instrucciones (Página 1): Medical Clinic Consultation Room & Examination Equipment
// 3. Instrucciones (Página 2 - Estados Visuales): Advanced Medical Technology & Clinical Diagnostic Center
// 4. Formulario: IMSS Hospital Modern Entrance & Clinical Corridor
const BASE_URL = import.meta.env.BASE_URL;

const SECTION_BACKGROUNDS: Record<AppSection, string> = {
  inicio: `${BASE_URL}imagenes/inicio.jpg`,
  instrucciones: `${BASE_URL}imagenes/instrucciones.webp`,
  instrucciones_2: `${BASE_URL}imagenes/instrucciones_2.jpeg`,
  formulario: `${BASE_URL}imagenes/formulario.png`,
};

export const ImageFragmentsTransition: React.FC<ImageFragmentsTransitionProps> = ({ section }) => {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fragment count: 14 boxes for desktop, 6 for mobile
  const fragmentCount = isMobile ? 6 : 14;
  const boxes = Array.from({ length: fragmentCount }, (_, i) => i);
  const currentBg = SECTION_BACKGROUNDS[section] || SECTION_BACKGROUNDS.inicio;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* Clear Photographic Background with Smooth Crossfade */}
      <AnimatePresence mode="sync">
        <motion.div
          key={`bg-img-${section}`}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
          className="absolute inset-0 bg-cover bg-center bg-fixed transition-transform duration-1000"
          style={{
            backgroundImage: `url("${currentBg}")`,
            backgroundPosition: 'center center',
            filter: 'brightness(0.92) contrast(1.05)',
          }}
        />
      </AnimatePresence>

      {/* Subtle Light-to-Dark Protective Gradient (Very light, allowing photos to shine through) */}
      <div 
        className="absolute inset-0 transition-colors duration-700"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0, 0, 0, 0.12) 0%, rgba(0, 0, 0, 0.38) 100%)'
        }}
      />

      {/* Animated Image Fragments Overlay Grid with clear glass reflection */}
      <div className="absolute inset-0 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 md:gap-3.5 p-3 opacity-15">
        <AnimatePresence mode="popLayout">
          {boxes.map((index) => {
            const delay = (index % 7) * 0.04 + Math.floor(index / 7) * 0.06;
            return (
              <motion.div
                key={`box-${section}-${index}`}
                data-i={index}
                className="relative rounded-xl border border-white/20 bg-white/5 backdrop-blur-[2px] overflow-hidden shadow-inner"
                initial={{
                  opacity: 0,
                  rotateY: index % 2 === 0 ? 30 : -30,
                  rotateX: index % 3 === 0 ? 20 : -20,
                  scale: 0.9,
                  y: index % 2 === 0 ? 15 : -15
                }}
                animate={{
                  opacity: 0.6,
                  rotateY: 0,
                  rotateX: 0,
                  scale: 1,
                  y: 0
                }}
                exit={{
                  opacity: 0,
                  scale: 0.95,
                  rotateY: index % 2 === 0 ? -30 : 30
                }}
                transition={{
                  duration: 0.7,
                  delay,
                  ease: [0.25, 1, 0.5, 1]
                }}
              >
                {/* Subtle light shimmer */}
                <div
                  className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent transform -translate-x-full animate-[shimmer_8s_infinite]"
                  style={{ animationDelay: `${index * 0.4}s` }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
