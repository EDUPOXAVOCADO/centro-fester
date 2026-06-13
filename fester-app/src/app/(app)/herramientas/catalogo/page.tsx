'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase-browser';
import AdminGuard from '@/components/AdminGuard';
import PageTitle from '@/components/PageTitle';
import { Save, ToggleLeft, ToggleRight } from 'lucide-react';

interface Herramienta { id: number; nombre: string; descripcion: string | null; activo: boolean; }

export default function CatalogoHerramientasPage() {
  const supabase = getSupabase();
  const [herramientas, setHerramientas] = useState<Herramienta[]>([]);
  const [form, setForm] = useState({ nombre: '', descripcion: '' });
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState('');
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase.from('herramientas').select('*').order('nombre');
    setHerramientas((data as Herramienta[]) ?? []);
  }, [supabase]);

  useEffect(() => { cargar(); }, [cargar]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(''); setMsgOk('');
    const nombre = form.nombre.trim();
    if (!nombre) return setMsg('El nombre es requerido.');
    setSaving(true);
    try {
      const { error } = await supabase.from('herramientas').insert({
        nombre,
        descripcion: form.descripcion.trim() || null,
        activo: true,
      });
      if (error) throw error;
      setMsgOk('Herramienta agregada.');
      setForm({ nombre: '', descripcion: '' });
      cargar();
    } catch (err: any) {
      setMsg(err.message ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActivo(h: Herramienta) {
    await supabase.from('herramientas').update({ activo: !h.activo }).eq('id', h.id);
    cargar();
  }

  return (
    <AdminGuard>
      <PageTitle title="Catalogo de Herramientas" subtitle="Alta y control de las herramientas disponibles" />
      {msg && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-fester-red">{msg}</div>}
      {msgOk && <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">{msgOk}</div>}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="card">
          <h2 className="font-bold text-fester-blue mb-4">Nueva herramienta</h2>
          <form className="space-y-3" onSubmit={guardar}>
            <div>
              <label className="label">Nombre *</label>
              <input className="input" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Soplete de Gas" />
            </div>
            <div>
              <label className="label">Descripcion</label>
              <input className="input" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Opcional" />
            </div>
            <button className="btn-primary w-full" disabled={saving}><Save size={16} /> {saving ? 'Guardando...' : 'Agregar herramienta'}</button>
          </form>
        </div>

        <div className="card overflow-x-auto p-0">
          <div className="px-5 pt-4 pb-2"><h2 className="font-bold text-fester-blue">Herramientas registradas</h2></div>
          <table className="w-full">
            <thead className="bg-slate-50 border-y border-slate-200">
              <tr><th className="th">Nombre</th><th className="th">Descripcion</th><th className="th text-center">Activo</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {herramientas.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50">
                  <td className="td font-semibold">{h.nombre}</td>
                  <td className="td text-slate-500 text-sm">{h.descripcion ?? '--'}</td>
                  <td className="td text-center">
                    <button onClick={() => toggleActivo(h)} className={h.activo ? 'text-green-600 hover:opacity-70' : 'text-slate-400 hover:opacity-70'}>
                      {h.activo ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                  </td>
                </tr>
              ))}
              {herramientas.length === 0 && (
                <tr><td colSpan={3} className="td text-center text-slate-400 py-10">Sin herramientas registradas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminGuard>
  );
}
