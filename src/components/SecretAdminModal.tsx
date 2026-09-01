import React, { FormEvent, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, Database, Eye, EyeOff, LogOut, RefreshCw, Search, ShieldCheck, User, X } from 'lucide-react';
import { AdminResponseRow, authenticateAdmin, fetchAdminResponses, logoutAdmin } from '../services/api.ts';

interface SecretAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const USER_BACKGROUND = `${import.meta.env.BASE_URL}imagenes/usuario.jpg`;

export const SecretAdminModal: React.FC<SecretAdminModalProps> = ({ isOpen, onClose }) => {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [rows, setRows] = useState<AdminResponseRow[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dataError, setDataError] = useState('');

  const loadRows = async (token: string) => {
    setIsLoading(true);
    setDataError('');
    try {
      setRows(await fetchAdminResponses(token));
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'No fue posible consultar Supabase');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && adminToken) void loadRows(adminToken);
  }, [isOpen, adminToken]);

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
    setRows([]);
    setSearch('');
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

  const normalizedSearch = search.trim().toLowerCase();
  const filteredRows = normalizedSearch
    ? rows.filter((row) => [
        row.entidad,
        row.clues_imb,
        row.nombre_de_la_unidad,
        row.usuario_nombre,
        row.usuario_email,
        row.pregunta,
      ].some((value) => value?.toLowerCase().includes(normalizedSearch)))
    : rows;

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
        <div className="mx-auto flex h-screen max-w-[1600px] flex-col p-4 sm:p-6">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-4 bg-[#0f5b4d] p-4 text-white shadow-md sm:p-5">
            <div className="flex items-center gap-3">
              <Database className="h-7 w-7 text-[#f0d68a]" />
              <div>
                <p className="text-xs font-bold uppercase text-[#f0d68a]">Supabase</p>
                <h2 className="text-xl font-bold sm:text-2xl">Base de respuestas</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => adminToken && void loadRows(adminToken)} disabled={isLoading} className="p-2.5 text-emerald-50 hover:bg-white/15 hover:text-white disabled:opacity-50" title="Actualizar datos">
                <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => void leaveAdmin()} className="p-2.5 text-emerald-50 hover:bg-white/15 hover:text-white" title="Cerrar sesión">
                <LogOut className="h-5 w-5" />
              </button>
              <button onClick={() => void leaveAdmin()} className="p-2.5 text-emerald-50 hover:bg-white/15 hover:text-white" title="Cerrar panel">
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-[#bfd5cf] bg-[#e8f1ee] p-3">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-700" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar entidad, CLUES, unidad o usuario" className="w-full border border-[#9fbbb4] bg-white py-2.5 pl-10 pr-3 text-sm text-[#17352f] outline-none placeholder:text-zinc-500 focus:border-[#0f5b4d] focus:ring-2 focus:ring-[#0f5b4d]/15" />
            </div>
            <p className="text-sm font-medium text-[#45645d]">{filteredRows.length} de {rows.length} registros</p>
          </div>

          {dataError && <div className="mb-4 border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-200" role="alert">{dataError}</div>}

          <div className="min-h-0 flex-1 overflow-auto border border-[#9fbbb4] bg-white shadow-sm">
            <table className="w-full min-w-[1100px] border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#176b5b] text-white">
                <tr>
                  {['Fecha', 'Tipo', 'Entidad', 'CLUES', 'Unidad', 'Usuario', 'Consultorio', 'Pregunta', 'Valor', 'Turno'].map((heading) => (
                    <th key={heading} className="border-b border-[#0d4f43] px-3 py-3 font-bold uppercase">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d9e5e1] text-[#17352f]">
                {filteredRows.map((row) => (
                  <tr key={row.id} className="odd:bg-white even:bg-[#f2f7f5] hover:bg-[#deeee9]">
                    <td className="whitespace-nowrap px-3 py-2.5 text-[#607770]">{new Date(row.fecha_registro).toLocaleString('es-MX')}</td>
                    <td className="px-3 py-2.5">{row.tipo_registro}</td>
                    <td className="px-3 py-2.5">{row.entidad || '-'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono font-semibold text-[#0f5b4d]">{row.clues_imb}</td>
                    <td className="max-w-64 truncate px-3 py-2.5" title={row.nombre_de_la_unidad || ''}>{row.nombre_de_la_unidad || '-'}</td>
                    <td className="px-3 py-2.5">{row.usuario_nombre || '-'}</td>
                    <td className="px-3 py-2.5 text-center">{row.consultorio ?? '-'}</td>
                    <td className="max-w-72 truncate px-3 py-2.5" title={row.pregunta || ''}>{row.pregunta || '-'}</td>
                    <td className="px-3 py-2.5 text-center font-bold">{row.valor ?? '-'}</td>
                    <td className="px-3 py-2.5">{row.turno || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!isLoading && filteredRows.length === 0 && <p className="p-10 text-center text-[#607770]">No se encontraron registros.</p>}
          </div>
        </div>
      )}
    </div>
  );
};