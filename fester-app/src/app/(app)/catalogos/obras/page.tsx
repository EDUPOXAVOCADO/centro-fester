'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase-browser';
import AdminGuard from '@/components/AdminGuard';
import PageTitle from '@/components/PageTitle';
import type { Cliente, Zona } from '@/types/db';
import { Building2, Plus } from 'lucide-react';

interface ObraRow {
  id: number;
  nombre: string;
  activo: boolean;
  clientes?: { nombre: string } | null;
  zonas?: { nombre: string } | null;
}

export default function ObrasPage() {
  const supabase = getSupabase();
  const [obras, setObras] = useState<ObraRow[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [form, setForm] = useState({ nombre: '', cliente_id: '', zona_id: '', cliente_nuevo: '' });
  const [modoClienteNuevo, setModoClienteNuevo] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState('');

  const cargar = useCallback(async () => {
    const [ob, cl, zo] = await Promise.all([
      supabase.from('obras').select('*, clientes(nombre), zonas(nombre)').order('nombre'),
      supabase.from('clientes').select('*').order('nombre'),
      supabase.from('zonas').select('*').eq('activo', true).order('nombre'),
    ]);
    setObras((ob.data as ObraRow[]) ?? []);
    setClientes((cl.data as Cliente[]) ?? []);
    setZonas((zo.data as Zona[]) ?? []);
  }, [supabase]);

  useEffect(() => { cargar(); }, [cargar]);

  async function agregarObra(e: React.FormEvent) {
    e.preventDefault();
    setMsg(''); setMsgOk('');
    if (!form.nombre.trim()) return setMsg('El nombre de la obra es obligatorio.');
    if (!form.zona_id) return setMsg('Selecciona la zona.');

    let clienteId: number | null = null;

    if (modoClienteNuevo) {
      if (!form.cliente_nuevo.trim()) return setMsg('Escribe el nombre del nuevo cliente.');
      const { data, error } = await supabase.from('clientes')
        .insert({ nombre: form.cliente_nuevo.trim() }).select('id').single();
      if (error) return setMsg(error.message);
      clienteId = data.id;
    } else if (form.cliente_id) {
      clienteId = Number(form.cliente_id);
    }

    const { error } = await supabase.from('obras').insert({
      nombre: form.nombre.trim(),
      cliente_id: clienteId,
      zona_id: Number(form.zona_id),
    });
    if (error) return setMsg(error.message);
    setMsgOk(`Obra "${form.nombre.trim()}" registrada.`);
    setForm({ nombre: '', cliente_id: '', zona_id: '', cliente_nuevo: '' });
    setModoClienteNuevo(false);
    cargar();
  }

  async function toggleObra(ob: ObraRow) {
    setMsg(''); setMsgOk('');
    const { error } = await supabase.from('obras').update({ activo: !ob.activo }).eq('id', ob.id);
    if (error) setMsg(error.message);
    else cargar();
  }

  return (
    <AdminGuard>
      <PageTitle
        title="Catálogo de Obras"
        subtitle="Solo el administrador registra obras — encargados y aplicadores solo pueden seleccionarlas"
      />

      {msg && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-fester-red">{msg}</div>}
      {msgOk && <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">{msgOk}</div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="card">
          <h2 className="font-bold text-fester-blue mb-4 flex items-center gap-2">
            <Building2 size={18} /> Nueva Obra
          </h2>
          <form className="space-y-3" onSubmit={agregarObra}>
            <div>
              <label className="label">Nombre de la obra *</label>
              <input className="input" required placeholder="ej. Bodega Nave 3 — Parque Industrial Norte"
                value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div>
              <label className="label">Zona *</label>
              <select className="input" required value={form.zona_id}
                onChange={(e) => setForm({ ...form, zona_id: e.target.value })}>
                <option value="">— Seleccionar —</option>
                {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Cliente</label>
                <button type="button" className="text-xs text-fester-blue hover:underline"
                  onClick={() => { setModoClienteNuevo(!modoClienteNuevo); setForm({ ...form, cliente_id: '', cliente_nuevo: '' }); }}>
                  {modoClienteNuevo ? '← Seleccionar existente' : '+ Nuevo cliente'}
                </button>
              </div>
              {modoClienteNuevo ? (
                <input className="input" placeholder="Nombre del nuevo cliente"
                  value={form.cliente_nuevo} onChange={(e) => setForm({ ...form, cliente_nuevo: e.target.value })} />
              ) : (
                <select className="input" value={form.cliente_id}
                  onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}>
                  <option value="">— Sin cliente / No aplica —</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              )}
            </div>
            <button className="btn-primary w-full mt-1"><Plus size={16} /> Registrar obra</button>
          </form>
        </div>

        <div className="card overflow-x-auto p-0">
          <div className="px-5 pt-5 pb-2">
            <h2 className="font-bold text-fester-blue">Obras registradas ({obras.length})</h2>
            <p className="text-xs text-slate-500 mt-0.5">Desactiva una obra terminada para que no aparezca en el formulario de captura.</p>
          </div>
          <table className="w-full min-w-[480px]">
            <thead className="bg-slate-50 border-y border-slate-200">
              <tr>
                <th className="th">Nombre de la obra</th>
                <th className="th">Cliente</th>
                <th className="th">Zona</th>
                <th className="th">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {obras.map((ob) => (
                <tr key={ob.id} className="hover:bg-slate-50">
                  <td className={`td font-medium ${ob.activo === false ? 'line-through text-slate-400' : ''}`}>
                    {ob.nombre}
                  </td>
                  <td className="td text-slate-500">{ob.clientes?.nombre ?? '—'}</td>
                  <td className="td text-slate-500">{ob.zonas?.nombre ?? '—'}</td>
                  <td className="td">
                    <button
                      className={`text-xs font-semibold hover:underline ${ob.activo === false ? 'text-green-600' : 'text-fester-red'}`}
                      onClick={() => toggleObra(ob)}>
                      {ob.activo === false ? 'Activar' : 'Desactivar'}
                    </button>
                  </td>
                </tr>
              ))}
              {obras.length === 0 && (
                <tr><td colSpan={4} className="td text-center text-slate-400 py-10">
                  No hay obras registradas aún.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminGuard>
  );
}
