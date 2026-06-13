'use client';
import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase-browser';
import AdminGuard from '@/components/AdminGuard';
import PageTitle from '@/components/PageTitle';
import { usePerfil } from '@/components/PerfilContext';
import type { Aplicador, Perfil } from '@/types/db';
import { KeyRound, UserPlus } from 'lucide-react';

export default function UsuariosPage() {
  const supabase = getSupabase();
  const perfil = usePerfil();
  const esAdmin = perfil.rol === 'admin';
  const [perfiles, setPerfiles] = useState<(Perfil & { aplicadores?: { nombre_completo: string } | null })[]>([]);
  const [aplicadores, setAplicadores] = useState<Aplicador[]>([]);
  const [zonas, setZonas] = useState<{ id: number; nombre: string }[]>([]);
  const [form, setForm] = useState({ usuario: '', password: '', nombre: '', rol: 'aplicador', aplicador_id: '', zona_id: '' });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    const [p, a, z] = await Promise.all([
      supabase.from('perfiles').select('*, aplicadores(nombre_completo)').order('nombre'),
      supabase.from('aplicadores').select('*').eq('activo', true).order('nombre_completo'),
      supabase.from('zonas').select('id, nombre').eq('activo', true).order('nombre'),
    ]);
    setPerfiles((p.data as any) ?? []);
    setAplicadores((a.data as Aplicador[]) ?? []);
    setZonas((z.data as any[]) ?? []);
  }, [supabase]);

  useEffect(() => { cargar(); }, [cargar]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg(null);
    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        aplicador_id: form.aplicador_id ? Number(form.aplicador_id) : null,
        zona_id: form.zona_id ? Number(form.zona_id) : null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setMsg({ ok: false, text: data.error }); return; }
    setMsg({ ok: true, text: 'Usuario ' + form.usuario + ' creado correctamente.' });
    setForm({ usuario: '', password: '', nombre: '', rol: 'aplicador', aplicador_id: '', zona_id: '' });
    cargar();
  }

  async function resetPassword(user_id: string, nombre: string) {
    const pwd = window.prompt('Nueva contrasena para ' + nombre + ' (minimo 6 caracteres):');
    if (!pwd) return;
    const res = await fetch('/api/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, password: pwd }),
    });
    const data = await res.json();
    setMsg(res.ok ? { ok: true, text: 'Contrasena actualizada.' } : { ok: false, text: data.error });
  }

  const rolBadge = (rol: string) => {
    if (rol === 'admin') return 'bg-blue-100 text-fester-blue';
    if (rol === 'gerente') return 'bg-indigo-100 text-indigo-700';
    if (rol === 'encargado') return 'bg-purple-100 text-purple-700';
    return 'bg-slate-100 text-slate-600';
  };

  const rolLabel = (rol: string) => {
    if (rol === 'encargado') return 'Encargado';
    if (rol === 'gerente') return 'Gerente';
    return rol;
  };

  return (
    <AdminGuard>
      <PageTitle title="Usuarios del Sistema" subtitle="Crea cuentas de acceso para el equipo" />
      <div className="card mb-6">
        <h2 className="font-bold text-fester-blue mb-4 flex items-center gap-2"><UserPlus size={18} /> Crear usuario</h2>
        <form onSubmit={crear} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="label">Usuario *</label>
            <input className="input" required value={form.usuario} autoCapitalize="none"
              onChange={(e) => setForm({ ...form, usuario: e.target.value.replace(/\s/g, '') })} placeholder="jperez" />
          </div>
          <div>
            <label className="label">Contrasena *</label>
            <input className="input" required type="text" minLength={6} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="minimo 6" />
          </div>
          <div>
            <label className="label">Nombre *</label>
            <input className="input" required value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div>
            <label className="label">Rol *</label>
            <select className="input" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value, aplicador_id: '', zona_id: '' })}>
              <option value="aplicador">Aplicador</option>
              <option value="encargado">Encargado de cuadrilla</option>
              {esAdmin && <option value="gerente">Gerente de tienda</option>}
              {esAdmin && <option value="admin">Administrador</option>}
            </select>
          </div>
