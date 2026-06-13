'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase-browser';
import AdminGuard from '@/components/AdminGuard';
import PageTitle from '@/components/PageTitle';
import { fmtFecha } from '@/lib/format';
import { Save } from 'lucide-react';

interface SalidaItem { id: number; folio: number; fecha: string; cantidad: number; herramientas?: { nombre: string } | null; perfiles?: { nombre: string } | null; obras?: { nombre: string } | null; }
interface DevRow { id: number; fecha_devolucion: string; cantidad_devuelta: number; estado: string; observaciones: string | null; salidas_herramientas?: { folio: number; herramientas?: { nombre: string } | null; perfiles?: { nombre: string } | null; } | null; }

const ESTADOS = [
  { value: 'bueno', label: 'Bueno' },
  { value: 'con_daño', label: 'Con Daño' },
  { value: 'perdido', label: 'Perdido' },
];

export default function DevolucionesPage() {
  const supabase = getSupabase();
  const hoy = new Date().toISOString().slice(0, 10);
  const [zonas, setZonas] = useState<{ id: number; nombre: string }[]>([]);
  const [zonaId, setZonaId] = useState('');
  const [salidas, setSalidas] = useState<SalidaItem[]>([]);
  const [devoluciones, setDevoluciones] = useState<DevRow[]>([]);
  const [form, setForm] = useState({ salida_id: '', fecha: hoy, cantidad: '1', estado: 'bueno', observaciones: '' });
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('zonas').select('id, nombre').eq('activo', true).order('nombre')
      .then(({ data }) => setZonas((data as any[]) ?? []));
  }, [supabase]);

  const cargarZona = useCallback(async (zId: string) => {
    const [s, d] = await Promise.all([
      supabase.from('salidas_herramientas').select('*, herramientas(nombre), perfiles(nombre), obras(nombre)').eq('zona_id', Number(zId)).order('folio', { ascending: false }),
      supabase.from('devoluciones_herramientas').select('*, salidas_herramientas(folio, herramientas(nombre), perfiles(nombre))').order('created_at', { ascending: false }).limit(100),
    ]);
    setSalidas((s.data as SalidaItem[]) ?? []);
    setDevoluciones((d.data as DevRow[]) ?? []);
    setForm((f) => ({ ...f, salida_id: '' }));
  }, [supabase]);

  function handleZonaChange(zId: string) {
    setZonaId(zId);
    if (zId) cargarZona(zId);
  }

  const salidaSeleccionada = salidas.find((s) => String(s.id) === form.salida_id);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(''); setMsgOk('');
    if (!form.salida_id) return setMsg('Selecciona la salida.');
    const cant = Number(form.cantidad);
    if (!cant || cant < 1) return setMsg('La cantidad debe ser mayor a 0.');
    if (salidaSeleccionada && cant > salidaSeleccionada.cantidad) return setMsg('No puedes devolver mas de lo que salio (' + salidaSeleccionada.cantidad + ').');

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('devoluciones_herramientas').insert({
        salida_id: Number(form.salida_id),
        fecha_devolucion: form.fecha,
        cantidad_devuelta: cant,
        estado: form.estado,
        observaciones: form.observaciones.trim() || null,
        created_by: user!.id,
      });
      if (error) throw error;
      setMsgOk('Devolucion registrada correctamente.');
      setForm({ salida_id: '', fecha: hoy, cantidad: '1', estado: 'bueno', observaciones: '' });
      cargarZona(zonaId);
    } catch (err: any) {
      setMsg(err.message ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  const estadoBadge = (estado: string) => {
    if (estado === 'bueno') return 'bg-green-100 text-green-700';
    if (estado === 'con_dano') return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-fester-red';
  };

  return (
    <AdminGuard>
      <PageTitle title="Registro de Devoluciones" subtitle="Registra cuando un jefe de cuadrilla regresa herramientas" />

      <div className="card mb-6">
        <label className="label font-bold text-base">Sucursal / Ciudad *</label>
        <select className="input mt-1" value={zonaId} onChange={(e) => handleZonaChange(e.target.value)}>
          <option value="">-- Selecciona tu sucursal --</option>
          {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
        </select>
      </div>

      {!zonaId && (
        <div className="text-center py-16 text-slate-400">
          Selecciona una sucursal para registrar devoluciones.
        </div>
      )}

      {zonaId && (
        <>
          {msg && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-fester-red">{msg}</div>}
          {msgOk && <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">{msgOk}</div>}

          <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
            <div className="card">
              <h2 className="font-bold text-fester-blue mb-4">Nueva devolucion</h2>
              <form className="space-y-3" onSubmit={guardar}>
                <div>
                  <label className="label">Selecciona la salida *</label>
                  <select className="input" required value={form.salida_id} onChange={(e) => setForm({ ...form, salida_id: e.target.value, cantidad: '1' })}>
                    <option value="">-- Folio / Herramienta --</option>
                    {salidas.map((s) => (
                      <option key={s.id} value={s.id}>
                        {String(s.folio).padStart(4, '0')} — {s.herramientas?.nombre ?? '?'} x{s.cantidad} ({s.perfiles?.nombre ?? '?'})
                      </option>
                    ))}
                  </select>
                  {salidaSeleccionada && (
                    <p className="mt-1 text-xs text-slate-500">
                      Salio el {fmtFecha(salidaSeleccionada.fecha)} — Obra: {salidaSeleccionada.obras?.nombre ?? '--'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="label">Fecha devolucion *</label>
                  <input className="input" type="date" required max={hoy} value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
                </div>
                <div>
                  <label className="label">Cantidad devuelta *</label>
                  <input className="input" type="number" min="1" max={salidaSeleccionada?.cantidad ?? 999} required value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
                </div>
                <div>
                  <label className="label">Estado *</label>
                  <select className="input" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                    {ESTADOS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Observaciones</label>
                  <textarea className="input" rows={2} value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} placeholder="Notas sobre el estado..." />
                </div>
                <button className="btn-primary w-full" disabled={saving}><Save size={16} /> {saving ? 'Guardando...' : 'Registrar devolucion'}</button>
              </form>
            </div>

            <div className="card overflow-x-auto p-0">
              <div className="px-5 pt-4 pb-2"><h2 className="font-bold text-fester-blue">Historial de devoluciones</h2></div>
              <table className="w-full min-w-[560px]">
                <thead className="bg-slate-50 border-y border-slate-200">
                  <tr><th className="th">Folio</th><th className="th">Herramienta</th><th className="th">Jefe</th><th className="th">Fecha Dev.</th><th className="th text-right">Cant.</th><th className="th">Estado</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {devoluciones.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="td font-bold text-fester-blue">{String(d.salidas_herramientas?.folio ?? 0).padStart(4, '0')}</td>
                      <td className="td">{d.salidas_herramientas?.herramientas?.nombre ?? '--'}</td>
                      <td className="td text-slate-600">{d.salidas_herramientas?.perfiles?.nombre ?? '--'}</td>
                      <td className="td whitespace-nowrap">{fmtFecha(d.fecha_devolucion)}</td>
                      <td className="td text-right font-semibold">{d.cantidad_devuelta}</td>
                      <td className="td">
                        <span className={'rounded-full px-2 py-0.5 text-xs font-semibold ' + estadoBadge(d.estado)}>
                          {ESTADOS.find((s) => s.value === d.estado)?.label ?? d.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {devoluciones.length === 0 && (
                    <tr><td colSpan={6} className="td text-center text-slate-400 py-10">Sin devoluciones registradas.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AdminGuard>
  );
}
