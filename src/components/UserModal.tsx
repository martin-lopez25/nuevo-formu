import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext.tsx';
import { User, Mail, MapPin, CheckCircle, AlertCircle, X, ShieldAlert } from 'lucide-react';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancel: () => void;
}

export const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onCancel }) => {
  const { selectedEntity, handleSaveUser, user } = useApp();
  const [name, setName] = useState<string>(user?.name || '');
  const [email, setEmail] = useState<string>(user?.email || '');
  const [nameError, setNameError] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [touched, setTouched] = useState<{ name: boolean; email: boolean }>({ name: false, email: false });

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  // Strict User Name validation: 2 to 5 words, >= 2 chars each, accents allowed, no numbers only
  const validateName = (val: string): boolean => {
    const clean = val.replace(/\s+/g, ' ').trim();
    if (!clean) {
      setNameError('El nombre completo es obligatorio.');
      return false;
    }
    // Check if contains only numbers
    if (/^\d+$/.test(clean)) {
      setNameError('El nombre no puede contener únicamente números.');
      return false;
    }
    // Split into words
    const words = clean.split(' ');
    if (words.length < 2) {
      setNameError('Debe ingresar al menos nombre y apellido (mínimo 2 palabras).');
      return false;
    }
    if (words.length > 5) {
      setNameError('El nombre no debe exceder 5 palabras.');
      return false;
    }
    for (const w of words) {
      if (w.length < 2) {
        setNameError(`La palabra "${w}" debe tener al menos 2 caracteres.`);
        return false;
      }
    }
    // Check for valid name characters (letters, accents, spaces, hyphens)
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/;
    if (!nameRegex.test(clean)) {
      setNameError('El nombre solo debe contener letras, acentos y espacios.');
      return false;
    }

    setNameError('');
    return true;
  };

  // Strict Institutional Email validation
  const validateEmail = (val: string): boolean => {
    const clean = val.trim();
    if (!clean) {
      setEmailError('El correo electrónico es obligatorio.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) {
      setEmailError('Ingrese un formato de correo electrónico válido (ej: usuario@imssbienestar.gob.mx).');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (touched.name) validateName(val);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (touched.email) validateEmail(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true });
    const isNameOk = validateName(name);
    const isEmailOk = validateEmail(email);

    if (isNameOk && isEmailOk) {
      handleSaveUser({
        name: name.replace(/\s+/g, ' ').trim(),
        email: email.trim()
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative max-w-md w-full rounded-3xl p-6 sm:p-8 backdrop-blur-xl bg-gradient-to-b from-[#9B2247]/55 via-[#611232]/45 to-black/65 border border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.6)] text-white"
        >
          <button
            type="button"
            onClick={onCancel}
            className="absolute top-4 right-4 text-white/60 hover:text-white p-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 transition-colors cursor-pointer"
            aria-label="Cancelar registro y volver a entidades"
            title="Volver a entidades"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 mx-auto flex items-center justify-center mb-3 shadow-inner backdrop-blur-sm">
              <User className="w-6 h-6 text-[#A57F2C]" />
            </div>
            <span className="text-xs uppercase tracking-widest text-amber-200 font-bold block drop-shadow-sm">
              PASO 2 — REGISTRO DE CAPTURISTA
            </span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white mt-1 drop-shadow">
              Datos del Usuario
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {/* Read-Only Entity Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-rose-100 flex items-center gap-1.5 drop-shadow-sm">
                <MapPin className="w-3.5 h-3.5 text-[#A57F2C]" />
                Entidad Federativa (Solo Lectura)
              </label>
              <div className="px-4 py-2.5 rounded-xl bg-black/40 border border-white/20 text-amber-300 font-bold text-sm backdrop-blur-sm">
                {selectedEntity || 'No seleccionada'}
              </div>
            </div>

            {/* Full Name Field */}
            <div className="space-y-1.5">
              <label htmlFor="user-full-name" className="text-xs font-semibold text-rose-100 flex items-center gap-1.5 drop-shadow-sm">
                <User className="w-3.5 h-3.5 text-[#A57F2C]" />
                Nombre completo
              </label>
              <input
                id="user-full-name"
                type="text"
                value={name}
                onChange={handleNameChange}
                onBlur={() => {
                  setTouched((p) => ({ ...p, name: true }));
                  validateName(name);
                }}
                placeholder="Ej: José Martín Valdez López"
                className={`w-full px-4 py-2.5 rounded-xl bg-black/30 backdrop-blur-sm border ${
                  nameError && touched.name ? 'border-amber-400 bg-red-950/40' : 'border-white/20 focus:border-amber-300'
                } text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition-all`}
                required
              />
              {nameError && touched.name && (
                <p className="text-xs text-amber-300 flex items-center gap-1 mt-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {nameError}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="user-email" className="text-xs font-semibold text-rose-100 flex items-center gap-1.5 drop-shadow-sm">
                <Mail className="w-3.5 h-3.5 text-[#A57F2C]" />
                Correo electrónico institucional
              </label>
              <input
                id="user-email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={() => {
                  setTouched((p) => ({ ...p, email: true }));
                  validateEmail(email);
                }}
                placeholder="ejemplo@imssbienestar.gob.mx"
                className={`w-full px-4 py-2.5 rounded-xl bg-black/30 backdrop-blur-sm border ${
                  emailError && touched.email ? 'border-amber-400 bg-red-950/40' : 'border-white/20 focus:border-amber-300'
                } text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition-all`}
                required
              />
              {emailError && touched.email && (
                <p className="text-xs text-amber-300 flex items-center gap-1 mt-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {emailError}
                </p>
              )}
            </div>

            {/* Action Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#A57F2C] hover:bg-[#b88f33] text-black font-bold text-sm sm:text-base shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                id="btn-confirmar-usuario"
              >
                <span>CONTINUAR</span>
                <CheckCircle className="w-4 h-4" />
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
