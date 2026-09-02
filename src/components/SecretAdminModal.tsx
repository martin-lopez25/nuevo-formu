import React, { FormEvent, useState } from 'react';
import { motion } from 'motion/react';
import { Activity, Building2, CheckCircle, Eye, EyeOff, LogOut, MapPinned, ShieldCheck, Stethoscope, TrendingUp, User, X } from 'lucide-react';
import { authenticateAdmin, logoutAdmin } from '../services/api.ts';
import entities from '../data/entities.json';

interface SecretAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const USER_BACKGROUND = `${import.meta.env.BASE_URL}imagenes/usuario.jpg`;
const totalUnits = entities.reduce((total, entity) => total + entity.totalUnits, 0);
const leadingEntities = [...entities]
  .sort((first, second) => second.totalUnits - first.totalUnits)
  .slice(0, 7);
const largestEntityTotal = leadingEntities[0]?.totalUnits || 1;
const monthlyProgress = [42, 51, 48, 63, 71, 78, 84];

export const SecretAdminModal: React.FC<SecretAdminModalProps> = ({ isOpen, onClose }) => {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setLoginError('');
    try {
      const token = await authenticateAdmin(username, password);
      setAdminToken(token);
      setLoginError('');
      setUsername('');
      setPassword('');
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'No fue posible iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const leaveAdmin = async () => {
    const token = adminToken;
    setAdminToken(null);
    setUsername('');
    setPassword('');
    setLoginError('');
    onClose();
    if (token) {
      try {
        await logoutAdmin(token);
      } catch (_) {}
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#f5f7f5] text-[#17352f]" role="dialog" aria-modal="true" aria-label="Administración">
      {!adminToken ? (
        <div
          className="relative min-h-full flex items-center justify-center overflow-hidden bg-white bg-cover bg-center p-4"
          style={{ backgroundImage: `url(${USER_BACKGROUND})` }}
        >
          <div className="absolute inset-0 bg-white/20" aria-hidden="true" />
          <motion.form
            onSubmit={handleLogin}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 w-full max-w-md rounded-3xl border border-white/25 bg-gradient-to-b from-[#9B2247]/95 via-[#611232]/95 to-[#27101b]/95 p-6 text-white shadow-[0_25px_60px_rgba(0,0,0,0.6)] sm:p-8"
          >
            <button type="button" onClick={() => void leaveAdmin()} className="absolute right-4 top-4 rounded-full border border-white/15 bg-white/10 p-1.5 text-white/60 transition-colors hover:bg-white/20 hover:text-white" aria-label="Cerrar modal">
              <X className="h-4 w-4" />
            </button>

            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-inner">
                <ShieldCheck className="h-6 w-6 text-[#A57F2C]" />
              </div>
              <span className="block text-xs font-bold uppercase tracking-widest text-amber-200">Acceso restringido</span>
              <h2 className="mt-1 text-xl font-extrabold text-white sm:text-2xl">Panel administrativo</h2>
            </div>

            <label className="mb-4 block text-xs font-semibold text-rose-100">
              <span className="mb-1.5 flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-[#A57F2C]" />Usuario</span>
              <input
                autoFocus
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-2.5 text-sm text-white outline-none placeholder-white/40 focus:border-amber-300 focus:ring-2 focus:ring-amber-400/40"
                autoComplete="username"
                required
              />
            </label>
            <label className="block text-xs font-semibold text-rose-100">
              <span className="mb-1.5 flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[#A57F2C]" />Contraseña</span>
              <span className="relative block">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-2.5 pr-11 text-sm text-white outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-400/40"
                  autoComplete="current-password"
                  required
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/60 hover:text-white" title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </span>
            </label>
            {loginError && <p className="mt-3 text-xs font-medium text-amber-300" role="alert">{loginError}</p>}
            <button type="submit" disabled={isLoading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#A57F2C] px-4 py-3 text-sm font-bold text-black shadow-lg transition-colors hover:bg-[#b88f33] disabled:opacity-60">
              <span>{isLoading ? 'VALIDANDO...' : 'INGRESAR'}</span>
              {!isLoading && <CheckCircle className="h-4 w-4" />}
            </button>
          </motion.form>
        </div>
      ) : (
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
              <button onClick={() => void leaveAdmin()} className="p-2.5 text-emerald-50 hover:bg-white/15 hover:text-white" title="Cerrar sesión">
                <LogOut className="h-5 w-5" />
              </button>
              <button onClick={() => void leaveAdmin()} className="p-2.5 text-emerald-50 hover:bg-white/15 hover:text-white" title="Cerrar panel">
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
      )}
    </div>
  );
};