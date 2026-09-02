import React from 'react';
import { motion } from 'motion/react';
import { Activity, Building2, LogOut, MapPinned, Stethoscope, TrendingUp, X } from 'lucide-react';
import entities from '../data/entities.json';

interface SecretAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const totalUnits = entities.reduce((total, entity) => total + entity.totalUnits, 0);
const leadingEntities = [...entities]
  .sort((first, second) => second.totalUnits - first.totalUnits)
  .slice(0, 7);
const largestEntityTotal = leadingEntities[0]?.totalUnits || 1;
const monthlyProgress = [42, 51, 48, 63, 71, 78, 84];

export const SecretAdminModal: React.FC<SecretAdminModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#f5f7f5] text-[#17352f]" role="dialog" aria-modal="true" aria-label="Administración">
      <div className="mx-auto h-screen max-w-[1500px] overflow-y-auto p-4 sm:p-6">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-[#0f5b4d] p-4 text-white shadow-md sm:p-5">
            <div className="flex items-center gap-3">
              <Activity className="h-7 w-7 text-[#f0d68a]" />
              <div>
                <p className="text-xs font-bold uppercase text-[#f0d68a]">Control institucional</p>
                <h2 className="text-xl font-bold sm:text-2xl">Tablero de seguimiento</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="p-2.5 text-emerald-50 hover:bg-white/15 hover:text-white" title="Salir del tablero">
                <LogOut className="h-5 w-5" />
              </button>
              <button onClick={onClose} className="p-2.5 text-emerald-50 hover:bg-white/15 hover:text-white" title="Cerrar panel">
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'Entidades activas', value: entities.length, icon: MapPinned, accent: '#0f5b4d' },
              { label: 'Unidades registradas', value: totalUnits.toLocaleString('es-MX'), icon: Building2, accent: '#9b2247' },
              { label: 'Avance general', value: '84%', icon: TrendingUp, accent: '#a57f2c' },
              { label: 'Cobertura operativa', value: '91%', icon: Stethoscope, accent: '#287271' },
            ].map((metric) => (
              <article key={metric.label} className="rounded-lg border border-[#c8d9d4] bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="grid h-9 w-9 place-items-center rounded-md text-white" style={{ backgroundColor: metric.accent }}>
                    <metric.icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase text-[#6d837d]">Actualizado</span>
                </div>
                <p className="text-2xl font-extrabold text-[#17352f] sm:text-3xl">{metric.value}</p>
                <p className="mt-1 text-xs font-medium text-[#607770] sm:text-sm">{metric.label}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <article className="rounded-lg border border-[#c8d9d4] bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-6 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-[#0f5b4d]">Distribución territorial</p>
                  <h3 className="mt-1 text-lg font-bold text-[#17352f]">Unidades por entidad</h3>
                </div>
                <span className="rounded-full bg-[#e5f0ed] px-3 py-1 text-xs font-bold text-[#0f5b4d]">Top 7</span>
              </div>
              <div className="space-y-4">
                {leadingEntities.map((entity) => (
                  <div key={entity.id} className="grid grid-cols-[minmax(90px,160px)_1fr_45px] items-center gap-3">
                    <span className="truncate text-xs font-semibold text-[#45645d]" title={entity.name}>{entity.name}</span>
                    <div className="h-3 overflow-hidden rounded-full bg-[#e8f1ee]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(entity.totalUnits / largestEntityTotal) * 100}%` }}
                        transition={{ duration: 0.7, delay: 0.08 }}
                        className="h-full rounded-full bg-[#176b5b]"
                      />
                    </div>
                    <span className="text-right text-xs font-bold text-[#17352f]">{entity.totalUnits}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-lg border border-[#c8d9d4] bg-[#e8f1ee] p-4 shadow-sm sm:p-6">
              <p className="text-xs font-bold uppercase text-[#0f5b4d]">Estado de captura</p>
              <h3 className="mt-1 text-lg font-bold text-[#17352f]">Avance nacional</h3>
              <div className="mx-auto my-7 grid h-40 w-40 place-items-center rounded-full" style={{ background: 'conic-gradient(#0f5b4d 0 84%, #c5d8d3 84% 100%)' }}>
                <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center shadow-inner">
                  <div>
                    <p className="text-3xl font-extrabold text-[#17352f]">84%</p>
                    <p className="text-[10px] font-bold uppercase text-[#607770]">Completado</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-md bg-white p-3">
                  <p className="text-lg font-bold text-[#0f5b4d]">3,327</p>
                  <p className="text-[10px] uppercase text-[#607770]">Completadas</p>
                </div>
                <div className="rounded-md bg-white p-3">
                  <p className="text-lg font-bold text-[#9b2247]">634</p>
                  <p className="text-[10px] uppercase text-[#607770]">Pendientes</p>
                </div>
              </div>
            </article>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.72fr]">
            <article className="rounded-lg border border-[#c8d9d4] bg-white p-4 shadow-sm sm:p-6">
              <p className="text-xs font-bold uppercase text-[#9b2247]">Evolución semanal</p>
              <div className="mt-1 flex items-end justify-between gap-4">
                <h3 className="text-lg font-bold text-[#17352f]">Progreso de captura</h3>
                <span className="text-sm font-bold text-[#0f5b4d]">+42 pts</span>
              </div>
              <div className="mt-6 flex h-44 items-end gap-3 border-b border-[#c8d9d4] px-2">
                {monthlyProgress.map((value, index) => (
                  <div key={value + index} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-[10px] font-bold text-[#45645d]">{value}%</span>
                    <motion.div initial={{ height: 0 }} animate={{ height: `${value}%` }} transition={{ duration: 0.6, delay: index * 0.06 }} className="w-full max-w-12 rounded-t-md bg-[#a57f2c]" />
                    <span className="pb-2 text-[10px] text-[#607770]">S{index + 1}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-lg bg-[#0f5b4d] p-5 text-white shadow-sm sm:p-6">
              <p className="text-xs font-bold uppercase text-[#f0d68a]">Resumen operativo</p>
              <h3 className="mt-1 text-lg font-bold">Situación actual</h3>
              <div className="mt-6 space-y-5">
                {[
                  { label: 'Con conexión', value: 91, color: '#f0d68a' },
                  { label: 'Captura validada', value: 84, color: '#ffffff' },
                  { label: 'Unidades en revisión', value: 16, color: '#d9819c' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex justify-between text-xs"><span>{item.label}</span><strong>{item.value}%</strong></div>
                    <div className="h-2 overflow-hidden rounded-full bg-black/20">
                      <div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <p className="py-5 text-center text-[11px] text-[#6d837d]">
            Tablero inicial de referencia. Las métricas de avance se conectarán a la fuente definitiva.
          </p>
      </div>
    </div>
  );
};