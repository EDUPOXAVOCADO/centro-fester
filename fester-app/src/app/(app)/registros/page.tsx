'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase-browser';
import AdminGuard from '@/components/AdminGuard';
import PageTitle from '@/components/PageTitle';
import Filtros from '@/components/Filtros';
import { fetchRegistros, fotoUrl, claveMaterial, type FiltrosRegistros } from '@/lib/registros';
import { exportarCSV, exportarExcel, exportarPDF } from '@/lib/export';
import { fmtFecha, fmtNum } from '@/lib/format';
import type { Registro } from '@/types/db';
import { FileDown, FileSpreadsheet, FileText, ImageIcon, Pencil, Trash2, X } from 'lucide-react';

export default function RegistrosPage() {
  const supabase = getSupabase();
  const [filtros, setFiltros] = useState<FiltrosRegistros>({});
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [verFotos, setVerFotos] = useState<Registro | null>(null);
  const [editar, setEditar] = useState<Registro | null>(null);
  const [editForm, setEditForm] = useState({ fecha: '', m2: '', horas: '', observaciones: '' });
  const [msg, setMsg] = useState('');

  const cargar = useCallback(async () => {
    try { setRegistros(await fetchRegistros(filtros)); }
    catch (e: any) { setMsg(e.message); }
  }, [filtros]);

  useEffect(() => { cargar(); }, [cargar]);

  async function eliminar(r: Registro) {
    if (!window.confirm(`¿Eliminar el registro de ${r.aplicadores?.nombre_completo} en "${r.obras?.nombre}" (${fmtFecha(r.fecha)})? Esta acción no se puede deshacer.`)) return;
    // Eliminar fotos del storage
    const paths = (r.fotografias ?? []).map((f) => f.path);
    if (paths.length) await supabase.storage.from('evidencias').remove(paths);
    const { error } = await supabase.from('registros').delete().eq('id', r.id);
    if (error) setMsg(error.message);
    cargar();
  }

  async function guardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!editar) return;
    const { error } = await supabase.from('registros').update({
      fecha: editForm.fecha,
      m2: Number(editForm.m2),
      horas: Number(editForm.horas),
      observaciones: editForm.observaciones || null,
    }).eq('id', editar.id);
    if (error) { setMsg(error.message); return; }
    setEditar(null);
    cargar();
  }

  const totalM2 = registros.reduce((s, r) => s + Number(r.m2), 0);
  const periodo = `${filtros.desde ?? 'inicio'} → ${filtros.hasta ?? 'hoy'}`;

  return (
    <AdminGuard>
      <PageTitle title="Registros de Actividades" subtitle={`${registros.length} registros · ${fmtNum(totalM2)} m²`}
        action={
          <div className="flex flex-wrap gap-2">
            <button className="btn-outline" onClick={() => exportarExcel(registros)}><FileSpreadsheet size={16} /> Excel</button>
            <button className="btn-outline" onClick={() => exportarCSV(registros)}><FileDown size={16} /> CSV</button>
            <button className="btn-outline" onClick={() => exportarPDF(registros, { titulo: 'Reporte de Registros', periodo })}><FileText size={16} /> PDF</button>
          </div>
        } />

      <Filtros value={filtros} onChange={setFiltros} />
      {msg && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-fester-red">{msg}</div>}

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[900px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="th">Fecha</th><th className="th">Aplicador</th><th className="th">Zona</th>
              <th className="th">Cliente / Obra</th><th className="th">Material</th>
              <th className="th text-right">m²</th><th className="th text-right">Horas</th>
              <th className="th text-right">m²/h</th><th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {registros.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="td whitespace-nowrap">{fmtFecha(r.fecha)}</td>
                <td className="td font-semibold">{r.aplicadores?.nombre_completo}</td>
                <td className="td">{r.zonas?.nombre}</td>
                <td className="td">
                  <div className="font-medium">{r.obras?.nombre}</div>
                  <div className="text-xs text-slate-400">{r.clientes?.nombre}</div>
                </td>
                <td className="td">{claveMaterial(r)}</td>
                <td className="td text-right font-bold text-fester-blue">{fmtNum(Number(r.m2))}</td>
                <td className="td text-right">{fmtNum(Number(r.horas))}</td>
                <td className="td text-right">{Number(r.horas) > 0 ? fmtNum(Number(r.m2) / Number(r.horas)) : '—'}</td>
                <td className="td whitespace-nowrap text-right">
                  <button title="Evidencias" className="p-1.5 text-slate-500 hover:text-fester-blue" onClick={() => setVerFotos(r)}><ImageIcon size={16} /></button>
                  <button title="Editar" className="p-1.5 text-slate-500 hover:text-fester-blue"
                    onClick={() => { setEditar(r); setEditForm({ fecha: r.fecha, m2: String(r.m2), horas: String(r.horas), observaciones: r.observaciones ?? '' }); }}>
                    <Pencil size={16} />
                  </button>
                  <button title="Eliminar" className="p-1.5 text-slate-500 hover:text-fester-red" onClick={() => eliminar(r)}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {registros.length === 0 && (
              <tr><td colSpan={9} className="td text-center text-slate-400 py-10">Sin registros con los filtros seleccionados.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {verFotos && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setVerFotos(null)}>
          <div className="bg-white rounded-2xl p-5 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-fester-blue mb-4">{verFotos.obras?.nombre} — Evidencias</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {(['antes', 'durante', 'despues'] as const).map((tipo) => {
                const foto = verFotos.fotografias?.find((ft) => ft.tipo === tipo);
                return (
                  <div key={tipo}>
                    <div className="text-xs font-bold uppercase text-slate-500 mb-1">{tipo}</div>
                    {foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fotoUrl(foto.path)} alt={tipo} className="rounded-lg w-full h-44 object-cover border border-slate-200" />
                    ) : <div className="rounded-lg w-full h-44 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">Sin foto</div>}
                  </div>
                );
              })}
            </div>
            <button className="btn-outline w-full mt-4" onClick={() => setVerFotos(null)}>Cerrar</button>
          </div>
        </div>
      )}

      {editar && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setEditar(null)}>
          <form className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()} onSubmit={guardarEdicion}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-fester-blue">Editar registro #{editar.id}</h3>
              <button type="button" onClick={() => setEditar(null)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div>
              <label className="label">Fecha</label>
              <input className="input" type="date" required value={editForm.fecha} onChange={(e) => setEditForm({ ...editForm, fecha: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">m²</label>
                <input className="input" type="number" step="0.01" min="0.01" required value={editForm.m2} onChange={(e) => setEditForm({ ...editForm, m2: e.target.value })} />
              </div>
              <div>
                <label className="label">Horas</label>
                <input className="input" type="number" step="0.5" min="0.5" required value={editForm.horas} onChange={(e) => setEditForm({ ...editForm, horas: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Observaciones</label>
              <textarea className="input" rows={3} value={editForm.observaciones} onChange={(e) => setEditForm({ ...editForm, observaciones: e.target.value })} />
            </div>
            <button className="btn-primary w-full">Guardar cambios</button>
          </form>
        </div>
      )}
    </AdminGuard>
  );
}
