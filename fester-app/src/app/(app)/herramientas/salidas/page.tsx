'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase-browser';
import AdminGuard from '@/components/AdminGuard';
import PageTitle from '@/components/PageTitle';
import { fmtFecha } from '@/lib/format';
import { Plus, Save, Trash2 } from 'lucide-react';

interface Herramienta { id: number; nombre: string; activo: boolean; }
interface Encargado { id: string; nombre: string; }
interface ObraOp { id: number; nombre: string; zona_id: number | null; zonas?: { nombre: string } | null; }
interface SalidaRow { id: number; folio: number; fecha: string; cantidad: number; notas: string | null; perfiles?: { nombre: string } | null; obras?: { nombre: string } | null; zonas?: { nombre: string } | null; herramientas?: { nombre: string } | null; }

export default function SalidasPage() {
  const supabase = getSupabase();
  const [herramientas, setHerramientas] = useState<Herramienta[]>([]);
  const [encargados, setEncargados] = useState<Encargado[]>([]);
  const [obras, setObras] = useState<ObraOp[]>([]);
  const [salidas, setSalidas] = useState<SalidaRow[]>([]);
  const [nextFolio, setNextFolio] = useState(1);
  const [zonaFiltro, setZonaFiltro] = useState('');
  const [zonas, setZonas] = useState<{ id: number; nombre: string }[]>([]);

  const hoy = new Date().toISOString().slice(0, 10);
  const [fecha, setFecha] = useState(hoy);
  const [encargadoId, setEncargadoId] = useState('');
  const [obraId, setObraId] = useState('');
  const [items, setItems] = useState([{ herramienta_id: '', cantidad: '1' }]);
  const [notas, setNotas] = useState('');
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState('');
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    const [h, e, ob, s, z, folio] = await Promise.all([
      supabase.from('herramientas').select('*').eq('activo', true).order('nombre'),
      supabase.from('perfiles').select('id, nombre').eq('rol', 'encargado').order('nombre'),
      supabase.from('obras').select('*, zonas(nombre)').neq('activo', false).order('nombre'),
      supabase.from('salidas_herramientas').select('*, perfiles(nombre), obras(nombre), zonas(nombre), herramientas(nombre)').order('folio', { ascending: false }).order('id', { ascending: false }).limit(100),
      supabase.from('zonas').select('id, nombre').eq('activo', true).order('nombre'),
      supabase.from('salidas_herramientas').select('folio').order('folio', { ascending: false }).limit(1),
    ]);
    setHerramientas((h.data as Herramienta[]) ?? []);
    setEncargados((e.data as Encargado[]) ?? []);
    setObras((ob.data as ObraOp[]) ?? []);
    setSalidas((s.data as SalidaRow[]) ?? []);
    setZonas((z.data as any[]) ?? []);
    const maxFolio = (folio.data as any[])?.[0]?.folio ?? 0;
    setNextFolio(maxFolio + 1);
  }, [supabase]);

  useEffect(() => { cargar(); }, [cargar]);

  function addItem() { setItems([...items, { herramienta_id: '', cantidad: '1' }]); }
  function removeItem(i: number) { setItems(items.filter((_, idx) => idx !== i)); }
  function setItem(i: number, field: string, val: string) {
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(''); setMsgOk('');
    if (!encargadoId) return setMsg('Selecciona el jefe de cuadrilla.');
    if (!obraId) return setMsg('Selecciona la obra.');
    if (items.some((it) => !it.herramienta_id)) return setMsg('Selecciona la herramienta en cada fila.');
    if (items.some((it) => !Number(it.cantidad) || Number(it.cantidad) < 1)) return setMsg('La cantidad debe ser mayor a 0.');

    const obraSeleccionada = obras.find((o) => String(o.id) === obraId);
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const rows = items.map((it) => ({
        folio: nextFolio,
        fecha,
        encargado_id: encargadoId,
        obra_id: Number(obraId),
        zona_id: obraSeleccionada?.zona_id ?? null,
        herramienta_id: Number(it.herramienta_id),
        cantidad: Number(it.cantidad),
        notas: notas.trim() || null,
        created_by: user!.id,
      }));
      const { error } = await supabase.from('salidas_herramientas').insert(rows);
      if (error) throw error;
      setMsgOk('Folio ' + String(nextFolio).padStart(4, '0') + ' registrado con ' + items.length + ' herramienta(s).');
      setEncargadoId(''); setObraId(''); setItems([{ herramienta_id: '', cantidad: '1' }]); setNotas('');
      cargar();
    } catch (err: any) {
      setMsg(err.message ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  const salidasFiltradas = zonaFiltro ? salidas.filter((s) => String((s as any).zona_id) === zonaFiltro) : salidas;
  const foliosVistos = new Set<number>();

  return (
    <AdminGuard>
      <PageTitle title="Registro de Salidas" subtitle="Registra que herramientas salen y a quien se las entregaste" />
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
                {obras.map((o) => <option key={o.id} value={o.id}>{o.nombre}{o.zonas?.nombre ? ' (' + o.zonas.nombre + ')' : ''}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Herramientas *</label>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select className="input flex-1" required value={item.herramienta_id} onChange={(e) => setItem(i, 'herramienta_id', e.target.value)}>
                    <option value="">-- Herramienta --</option>
                    {herramientas.map((h) => <option key={h.id} value={h.id}>{h.nombre}</option>)}
                  </select>
                  <input className="input flex-none w-24" type="number" min="1" required value={item.cantidad} onChange={(e) => setItem(i, 'cantidad', e.target.value)} placeholder="Cant." />
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
        <div className="px-5 pt-4 pb-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-fester-blue">Historial de salidas</h2>
          <select className="input !w-auto" value={zonaFiltro} onChange={(e) => setZonaFiltro(e.target.value)}>
            <option value="">Todas las zonas</option>
            {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
          </select>
        </div>
        <table className="w-full min-w-[640px]">
          <thead className="bg-slate-50 border-y border-slate-200">
            <tr><th className="th">Folio</th><th className="th">Fecha</th><th className="th">Jefe</th><th className="th">Obra</th><th className="th">Zona</th><th className="th">Herramienta</th><th className="th text-right">Cant.</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {salidasFiltradas.map((s) => {
              const esNuevoFolio = !foliosVistos.has(s.folio);
              foliosVistos.add(s.folio);
              return (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="td font-bold text-fester-blue">{esNuevoFolio ? String(s.folio).padStart(4, '0') : ''}</td>
                  <td className="td whitespace-nowrap">{esNuevoFolio ? fmtFecha(s.fecha) : ''}</td>
                  <td className="td">{esNuevoFolio ? (s.perfiles?.nombre ?? '--') : ''}</td>
                  <td className="td text-slate-600">{esNuevoFolio ? (s.obras?.nombre ?? '--') : ''}</td>
                  <td className="td text-slate-500 text-sm">{esNuevoFolio ? (s.zonas?.nombre ?? '--') : ''}</td>
                  <td className="td">{s.herramientas?.nombre ?? '--'}</td>
                  <td className="td text-right font-semibold">{s.cantidad}</td>
                </tr>
              );
            })}
            {salidasFiltradas.length === 0 && (
              <tr><td colSpan={7} className="td text-center text-slate-400 py-10">Sin salidas registradas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminGuard>
  );
}
