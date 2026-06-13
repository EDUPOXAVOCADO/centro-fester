'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase-browser';
import AdminGuard from '@/components/AdminGuard';
import PageTitle from '@/components/PageTitle';
import type { Aplicador, Zona } from '@/types/db';
import { Pencil, Plus, X } from 'lucide-react';

const vacio = { nombre_completo: '', zona_id: '', telefono: '', fecha_ingreso: '', activo: true };

export default function AplicadoresPage() {
  const supabase = getSupabase();
  const [items, setItems] = useState<Aplicador[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [form, setForm] = useState<any>(null); // null = cerrado
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    const [a, z] = await Promise.all([
      supabase.from('aplicadores').select('*, zonas(nombre)').order('nombre_completo'),
      supabase.from('zonas').select('*').order('nombre'),
    ]);
    setItems((a.data as Aplicador[]) ?? []);
    setZonas((z.data as Zona[]) ?? []);
  }, [supabase]);

  useEffect(() => { cargar(); }, [cargar]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    const payload = {
      nombre_completo: form.nombre_completo.trim(),
      zona_id: form.zona_id ? Number(form.zona_id) : null,
      telefono: form.telefono || null,
      fecha_ingreso: form.fecha_ingreso || null,
      activo: form.activo,
    };
    const q = editId
      ? supabase.from('aplicadores').update(payload).eq('id', editId)
      : supabase.from('aplicadores').insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) { setError(error.message); return; }
    setForm(null); setEditId(null);
    cargar();
  }

  return (
    <AdminGuard>
      <PageTitle title="Catálogo de Aplicadores" subtitle={`${items.length} aplicadores registrados`}
        action={<button className="btn-primary" onClick={() => { setForm({ ...vacio }); setEditId(null); }}><Plus size={16} /> Nuevo aplicador</button>} />

      {form && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-fester-blue">{editId ? 'Editar aplicador' : 'Nuevo aplicador'}</h2>
            <button onClick={() => setForm(null)}><X size={18} className="text-slate-400" /></button>
          </div>
          <form onSubmit={guardar} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="label">Nombre completo *</label>
              <input className="input" required value={form.nombre_completo}
                onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })} />
            </div>
            <div>
              <label className="label">Zona</label>
              <select className="input" value={form.zona_id} onChange={(e) => setForm({ ...form, zona_id: e.target.value })}>
                <option value="">— Seleccionar —</option>
                {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input className="input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div>
              <label className="label">Fecha de ingreso</label>
              <input className="input" type="date" value={form.fecha_ingreso}
                onChange={(e) => setForm({ ...form, fecha_ingreso: e.target.value })} />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <input id="activo" type="checkbox" checked={form.activo}
                onChange={(e) => setForm({ ...form, activo: e.target.checked })} className="h-4 w-4" />
              <label htmlFor="activo" className="text-sm font-medium">Activo</label>
            </div>
            <div className="flex items-end">
              <button className="btn-primary w-full" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
            </div>
            {error && <p className="text-sm text-fester-red sm:col-span-2 lg:col-span-3">{error}</p>}
          </form>
        </div>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[640px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="th">Nombre</th><th className="th">Zona</th><th className="th">Teléfono</th>
              <th className="th">Ingreso</th><th className="th">Estado</th><th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="td font-semibold">{a.nombre_completo}</td>
                <td className="td">{a.zonas?.nombre ?? '—'}</td>
                <td className="td">{a.telefono ?? '—'}</td>
                <td className="td">{a.fecha_ingreso ?? '—'}</td>
                <td className="td">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.activo ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                    {a.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="td text-right">
                  <button className="text-fester-blue hover:underline inline-flex items-center gap-1 text-sm font-semibold"
                    onClick={() => {
                      setEditId(a.id);
                      setForm({
                        nombre_completo: a.nombre_completo, zona_id: a.zona_id ?? '',
                        telefono: a.telefono ?? '', fecha_ingreso: a.fecha_ingreso ?? '', activo: a.activo,
                      });
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}>
                    <Pencil size={14} /> Editar
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td className="td text-center text-slate-400 py-10" colSpan={6}>Sin aplicadores. Crea el primero.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminGuard>
  );
}
