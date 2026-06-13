'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase-browser';
import AdminGuard from '@/components/AdminGuard';
import PageTitle from '@/components/PageTitle';
import { fmtFecha } from '@/lib/format';
import { Plus, Save, Trash2 } from 'lucide-react';

interface Herramienta { id: number; nombre: string; activo: boolean; }
interface Encargado { id: string; nombre: string; }
interface ObraOp { id: number; nombre: string; zona_id: number | null; }
interface SalidaRow { id: number; folio: number; fecha: string; cantidad: number; notas: string | null; zona_id: number | null; perfiles?: { nombre: string } | null; obras?: { nombre: string } | null; herramientas?: { nombre: string } | null; }

export default function SalidasPage() {
  const supabase = getSupabase();
  const [herramientas, setHerramientas] = useState<Herramienta[]>([]);
  const [encargados, setEncargados] = useState<Encargado[]>([]);
  const [obras, setObras] = useState<ObraOp[]>([]);
  const [salidas, setSalidas] = useState<SalidaRow[]>([]);
  const [zonas, setZonas] = useState<{ id: number; nombre: string }[]>([]);
  const [zonaId, setZonaId] = useState('');
  const [nextFolio, setNextFolio] = useState(1);

  const hoy = new Date().toISOString().slice(0, 10);
  const [fecha, setFecha] = useState(hoy);
  const [encargadoId, setEncargadoId] = useState('');
  const [obraId, setObraId] = useState('');
  const [items, setItems] = useState([{ herramienta_id: '', cantidad: '1' }]);
  const [notas, setNotas] = useState('');
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function init() {
      const [h, e, z] = await Promise.all([
        supabase.from('herramientas').select('*').eq('activo', true).order('nombre'),
        supabase.from('perfiles').select('id, nombre').eq('rol', 'encargado').order('nombre'),
        supabase.from('zonas').select('id, nombre').eq('activo', true).order('nombre'),
      ]);
      setHerramientas((h.data as Herramienta[]) ?? []);
      setEncargados((e.data as Encargado[]) ?? []);
      setZonas((z.data as any[]) ?? []);
    }
    init();
  }, [supabase]);

  const cargarZona = useCallback(async (zId: string) => {
    const [ob, s, folio] = await Promise.all([
      supabase.from('obras').select('id, nombre, zona_id').eq('zona_id', Number(zId)).neq('activo', false).order('nombre'),
      supabase.from('salidas_herramientas').select('*, perfiles(nombre), obras(nombre), herramientas(nombre)').eq('zona_id', Number(zId)).order('folio', { ascending: false }).order('id', { ascending: false }).limit(100),
      supabase.from('salidas_herramientas').select('folio').eq('zona_id', Number(zId)).order('folio', { ascending: false }).limit(1),
    ]);
    setObras((ob.data as ObraOp[]) ?? []);
    setSalidas((s.data as SalidaRow[]) ?? []);
    const maxFolio = (folio.data as any[])?.[0]?.folio ?? 0;
    setNextFolio(maxFolio + 1);
    setObraId('');
    setEncargadoId('');
    setItems([{ herramienta_id: '', cantidad: '1' }]);
  }, [supabase]);

  function handleZonaChange(zId: string) {
    setZonaId(zId);
    if (zId) cargarZona(zId);
  }

  function addItem() { setItems([...items, { herramienta_id: '', cantidad: '1' }]); }
  function removeItem(i: number) { setItems(items.filter((_, idx) => idx !== i)); }
  function setItem(i: number, field: string, val: string) {
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(''); setMsgOk('');
    if (!zonaId) return setMsg('Selecciona la sucursal primero.');
    if (!encargadoId) return setMsg('Selecciona el jefe de cuadrilla.');
    if (!obraId) return setMsg('Selecciona la obra.');
    if (items.some((it) => !it.herramienta_id)) return setMsg('Selecciona la herramienta en cada fila.');
    if (items.some((it) => !Number(it.cantidad) || Number(it.cantidad) < 1)) return setMsg('La cantidad debe ser mayor a 0.');

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const rows = items.map((it) => ({
        folio: nextFolio,
        fecha,
        encargado_id: encargadoId,
        obra_id: Number(obraId),
        zona_id: Number(zonaId),
        herramienta_id: Number(it.herramienta_id),
        cantidad: Number(it.cantidad),
        notas: notas.trim() || null,
        created_by: user!.id,
      }));
      const { error } = await supabase.from('salidas_herramientas').insert(rows);
      if (error) throw error;
      setMsgOk('Folio ' + String(nextFolio).padStart(4, '0') + ' registrado con ' + items.length + ' herramienta(s).');
      setEncargadoId(''); setObraId(''); setItems([{ herramienta_id: '', cantidad: '1' }]); setNotas('');
      cargarZona(zonaId);
    } catch (err: any) {
      setMsg(err.message ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  const foliosVistos = new Set<number>();

  return (
    <AdminGuard>
      <PageTitle title="Registro de Salidas" subtitle="Registra que herramientas salen y a quien se las entregaste" />

      <div className="card mb-6">
        <label className="label font-bold text-base">Sucursal / Ciudad *</label>
        <select className="input mt-1" value={zonaId} onChange={(e) => handleZonaChange(e.target.value)}>
          <option value="">-- Selecciona tu sucursal --</option>
          {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
        </select>
      </div>

      {!zonaId && (
        <div className="text-center py-16 text-slate-400">
          Selecciona una sucursal para ver el historial y registrar salidas.
        </div>
      )}

      {zonaId && (
        <>
          {msg && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-fester-red">{msg}</div>}
          {msgOk && <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">{msgOk}</div>}

          <div className="card mb-6">
            <h2 className="font-bold text-fester-blue mb-4">
              Nueva salida — Folio <span className="text-fester-red">{String(nextFolio).padStart(4, '0')}</span>
            </h2>
            <form onSubmit={guardar} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">Fecha *</label>
                  <input className="input" type="date" required max={hoy} value={fecha} onChange={(e) => setFecha(e.target.value)} />
                </div>
                <div>
                  <label className="label">Jefe de cuadrilla *</label>
                  <select className="input" required value={encargadoId} onChange={(e) => setEncargadoId(e.target.value)}>
                    <option value="">-- Seleccionar --</option>
                    {encargados.map((enc) => <option key={enc.id} value={enc.id}>{enc.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Obra *</label>
                  <select className="input" required value={obraId} onChange={(e) => setObraId(e.target.value)}>
                    <option value="">-- Seleccionar --</option>
                    {obras.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Herramientas *</label>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <div className="flex-1 min-w-0">
                        <select className="input w-full" required value={item.herramienta_id} onChange={(e) => setItem(i, 'herramienta_id', e.target.value)}>
                          <option value="">-- Herramienta --</option>
                          {herramientas.map((h) => <option key={h.id} value={h.id}>{h.nombre}</option>)}
                        </select>
                      </div>
                      <div className="shrink-0 w-24">
                        <input className="input w-full" type="number" min="1" required value={item.cantidad} onChange={(e) => setItem(i, 'cantidad', e.target.value)} placeholder="Cant." />
                      </div>
                      {items.length > 1 && (
                        <button type="button" className="text-fester-red hover:opacity-70" onClick={() => removeItem(i)}><Trash2 size={16} /></button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" className="mt-2 text-sm text-fester-blue hover:underline flex items-center gap-1" onClick={addItem}>
                  <Plus size={14} /> Agregar otra herramienta
                </button>
              </div>

              <div>
                <label className="label">Notas</label>
                <input className="input" placeholder="Observaciones opcionales" value={notas} onChange={(e) => setNotas(e.target.value)} />
              </div>

              <button className="btn-primary" disabled={saving}><Save size={16} /> {saving ? 'Guardando...' : 'Registrar salida'}</button>
            </form>
          </div>

          <div className="card overflow-x-auto p-0">
            <div className="px-5 pt-4 pb-2">
              <h2 className="font-bold text-fester-blue">Historial de salidas</h2>
            </div>
            <table className="w-full min-w-[600px]">
              <thead className="bg-slate-50 border-y border-slate-200">
                <tr><th className="th">Folio</th><th className="th">Fecha</th><th className="th">Jefe</th><th className="th">Obra</th><th className="th">Herramienta</th><th className="th text-right">Cant.</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salidas.map((s) => {
                  const esNuevoFolio = !foliosVistos.has(s.folio);
                  foliosVistos.add(s.folio);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="td font-bold text-fester-blue">{esNuevoFolio ? String(s.folio).padStart(4, '0') : ''}</td>
                      <td className="td whitespace-nowrap">{esNuevoFolio ? fmtFecha(s.fecha) : ''}</td>
                      <td className="td">{esNuevoFolio ? (s.perfiles?.nombre ?? '--') : ''}</td>
                      <td className="td text-slate-600">{esNuevoFolio ? (s.obras?.nombre ?? '--') : ''}</td>
                      <td className="td">{s.herramientas?.nombre ?? '--'}</td>
                      <td className="td text-right font-semibold">{s.cantidad}</td>
                    </tr>
                  );
                })}
                {salidas.length === 0 && (
                  <tr><td colSpan={6} className="td text-center text-slate-400 py-10">Sin salidas para esta sucursal.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminGuard>
  );
}
