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
          <div>
            {form.rol === 'aplicador' && (
              <>
                <label className="label">Aplicador vinculado *</label>
                <select className="input" value={form.aplicador_id} required
                  onChange={(e) => setForm({ ...form, aplicador_id: e.target.value })}>
                  <option value="">-- Seleccionar --</option>
                  {aplicadores.map((a) => <option key={a.id} value={a.id}>{a.nombre_completo}</option>)}
                </select>
              </>
            )}
            {form.rol === 'gerente' && (
              <>
                <label className="label">Sucursal *</label>
                <select className="input" value={form.zona_id} required
                  onChange={(e) => setForm({ ...form, zona_id: e.target.value })}>
                  <option value="">-- Seleccionar --</option>
                  {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                </select>
              </>
            )}
            {(form.rol === 'encargado' || form.rol === 'admin') && (
              <div className="pt-6 text-xs text-slate-400">Sin campo adicional requerido.</div>
            )}
          </div>
          <div className="sm:col-span-2 lg:col-span-5 flex items-center gap-4">
            <button className="btn-primary" disabled={saving}>{saving ? 'Creando...' : 'Crear usuario'}</button>
            {msg && <span className={'text-sm font-medium ' + (msg.ok ? 'text-green-600' : 'text-fester-red')}>{msg.text}</span>}
          </div>
        </form>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[560px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="th">Nombre</th>
              <th className="th">Usuario</th>
              <th className="th">Rol</th>
              <th className="th">Aplicador vinculado</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {perfiles.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="td font-semibold">{p.nombre}</td>
                <td className="td">{p.usuario}</td>
                <td className="td">
                  <span className={'rounded-full px-2.5 py-0.5 text-xs font-semibold ' + rolBadge(p.rol)}>
                    {rolLabel(p.rol)}
                  </span>
                </td>
                <td className="td">{p.aplicadores?.nombre_completo ?? '--'}</td>
                <td className="td text-right">
                  <button className="text-fester-blue hover:underline inline-flex items-center gap-1 text-sm font-semibold"
                    onClick={() => resetPassword(p.id, p.nombre)}>
                    <KeyRound size={14} /> Contrasena
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminGuard>
  );
}
