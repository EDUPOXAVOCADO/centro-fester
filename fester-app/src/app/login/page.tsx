'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase-browser';
import { usuarioAEmail } from '@/lib/format';
import Logo from '@/components/Logo';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithPassword({
      email: usuarioAEmail(usuario),
      password,
    });
    setLoading(false);
    if (error) {
      setError('Usuario o contraseña incorrectos.');
      return;
    }
    window.location.href = '/';
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-fester-blue via-fester-blue-dark to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex justify-center mb-6"><Logo size={52} /></div>
          <h1 className="text-center text-lg font-bold text-slate-800">
            Sistema de Gestión y Productividad
          </h1>
          <p className="text-center text-sm text-slate-500 mb-6">de Aplicadores</p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label">Usuario</label>
              <input className="input" value={usuario} onChange={(e) => setUsuario(e.target.value)}
                placeholder="ej. jperez" required autoFocus autoCapitalize="none" />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input className="input" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-fester-red text-sm px-3 py-2">
                {error}
              </div>
            )}
            <button className="btn-primary w-full py-3" disabled={loading}>
              <LogIn size={18} /> {loading ? 'Entrando…' : 'Iniciar sesión'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-blue-200 mt-6">
          © {new Date().getFullYear()} Centro Fester Uruapan
        </p>
      </div>
    </div>
  );
}
