import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useStore';
import { motion } from 'motion/react';
import { Mail, Lock, User as UserIcon, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const portalSettings = useAuthStore((state) => state.portalSettings);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Email validation: must have @ and a dot separating the domain
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setError('Por favor, ingresa un correo electrónico válido (debe contener @ y un punto en el dominio).');
      setLoading(false);
      return;
    }

    try {
      if (isRegister) {
        // Name validation: minimum 5 letters
        if (name.trim().length < 5) {
          throw new Error('El nombre completo no debe quedar vacío y debe tener al menos 5 caracteres.');
        }

        // Password complexity validation: uppercase, lowercase, number
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        if (!hasUppercase || !hasLowercase || !hasNumber) {
          throw new Error('La contraseña debe contener al menos una letra mayúscula, letras minúsculas y un número.');
        }

        // Confirm password validation: identical passwords
        if (password !== confirmPassword) {
          throw new Error('Las contraseñas no coinciden.');
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              role: 'user', // Always default to 'user'; role is assigned server-side
            }
          }
        });
        if (signUpError) throw signUpError;
        // Wait for auth listener to pick up the session and redirect
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        // Wait for auth listener to pick up the session and redirect
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error durante la autenticación.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsRegister(!isRegister);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError(null);
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error con Google Login.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-[370px] w-full bg-surface rounded-3xl shadow-xl p-6 border border-surface/50"
      >
        <div className="text-center mb-5">
          {portalSettings?.logo_url ? (
            <img
              src={portalSettings.logo_url}
              alt={portalSettings.name || 'Tentación Food Store'}
              className="h-12 object-contain mx-auto mb-2"
            />
          ) : (
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-dark font-medium text-2xl mx-auto mb-2 shadow-lg shadow-primary/20">
              T
            </div>
          )}
          <h2 className="text-2xl font-bold text-dark tracking-tight">{isRegister ? 'Crear Cuenta' : 'Bienvenido'}</h2>
          <p className="text-xs text-muted mt-1">
            {isRegister ? 'Únete a la red de comida más grande' : 'Ingresa para pedir tus platos favoritos'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 rounded-2xl p-3 mb-4 flex items-start space-x-2 text-xs">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Nombre Completo</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input 
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface border border-surface rounded-2xl py-3 pl-11 pr-4 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-dark text-sm"
                  placeholder="Tu nombre"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface border border-surface rounded-2xl py-3 pl-11 pr-4 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-dark text-sm"
                placeholder="tu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <input 
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface border border-surface rounded-2xl py-3 pl-11 pr-11 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-dark text-sm"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-dark transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Confirmar Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input 
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-surface border border-surface rounded-2xl py-3 pl-11 pr-11 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-dark text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-dark transition-colors focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-dark py-3 rounded-2xl font-bold text-sm hover:bg-accent transition-all shadow-lg shadow-primary/20 flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wider"
          >
            <span>{loading ? 'Cargando...' : isRegister ? 'Registrarse' : 'Entrar'}</span>
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-surface"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-surface text-muted font-medium">O continuar con</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white text-gray-900 py-3 rounded-2xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm border border-gray-200 flex items-center justify-center space-x-3 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wider"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <span>Google</span>
        </button>

        <div className="mt-6 text-center">
          <button 
            onClick={handleToggleMode}
            className="text-accent text-xs font-semibold hover:underline"
          >
            {isRegister ? '¿Ya tienes cuenta? Ingresa' : '¿No tienes cuenta? Regístrate'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
