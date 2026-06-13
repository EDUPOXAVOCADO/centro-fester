'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase-browser';
import AdminGuard from '@/components/AdminGuard';
import PageTitle from '@/components/PageTitle';
import { fmtFecha } from '@/lib/format';
import { AlertTriangle, CheckCircle2, Package } from 'lucide-react';

interface SalidaRaw {
  id: number; folio: number; fecha: string; cantidad: number; zona_id: number | null;
  perfiles?: { nombre: string } | null;
  obras?: { nombre: string } | null;
  zonas?: { nombre: string } | null;
  herramientas?: { nombre: string } | null;
  devoluciones_herramientas?: { cantidad_devuelta: number; estado: string }[];
}

export default function DashboardHerramientasPage() {
  const supabase = getSupabase();
  const [salidas, setSalidas] = useState<SalidaRaw[]>([]);
  const [zonas, setZonas] = useState<{ id: number; nombre: string }[]>([]);
  const [zonaFiltro, setZonaFiltro] = useState('');
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [s, z] = await Promise.all([
      supabase.from('salidas_herramientas')
        .select('*, perfiles(nombre), obras(nombre), zonas(nombre), herramientas(nombre), devoluciones_herramientas(cantidad_devuelta, estado)')
        .order('folio', { ascending: false }),
      supabase.from('zonas').select('id, nombre').eq('activo', true).order('nombre'),
    ]);
    setSalidas((s.data as SalidaRaw[]) ?? []);
    setZonas((z.data as any[]) ?? []);
    setCargando(false);
  }, [supabase]);

  useEffect(() => { cargar(); }, [cargar]);

  const enCampo = useMemo(() => {
    return salidas.map((s) => {
      const devuelto = (s.devoluciones_herramientas ?? []).reduce((acc, d) => acc + d.cantidad_devuelta, 0);
      return { ...s, devuelto, enCampo: s.cantidad - devuelto };
    }).filter((s) => s.enCampo > 0);
  }, [salidas]);

  const filtrados = zonaFiltro ? enCampo.filter((s) => String(s.zona_id) === zonaFiltro) : enCampo;

  const diasEnCampo = (fecha: string) => Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000);

  const semaforo = (dias: number) => {
    if (dias <= 30) return { cls: 'bg-green-100 text-green-700', label: 'OK' };
    if (dias <= 60) return { cls: 'bg-yellow-100 text-yellow-700', label: 'Seguimiento' };
    return { cls: 'bg-red-100 text-fester-red', label: 'Urgente' };
  };

  const porJefe = useMemo(() => {
    const map = new Map<string, { nombre: string; herramientas: number }>();
    for (const s of filtrados) {
      const key = s.perfiles?.nombre ?? '--';
      if (!map.has(key)) map.set(key, { nombre: key, herramientas: 0 });
      map.get(key)!.herramientas += s.enCampo;
    }
    return Array.from(map.values()).sort((a, b) => b.herramientas - a.herramientas);
  }, [filtrados]);

  return (
    <AdminGuard>
      <PageTitle title="Dashboard de Herramientas" subtitle="Que hay en campo ahora — por jefe de cuadrilla y zona" />

      <div className="flex flex-wrap gap-3 mb-6 items-center justify-between">
        <div className="flex gap-4">
          <div className="card !py-3 !px-5 flex items-center gap-3">
            <Package className="text-fester-blue" size={22} />
            <div>
              <div className="text-2xl font-extrabold text-fester-blue">{filtrados.reduce((a, s) => a + s.enCampo, 0)}</div>
              <div className="text-xs text-slate-500">Herramientas en campo</div>
            </div>
          </div>
          <div className="card !py-3 !px-5 flex items-center gap-3">
            <AlertTriangle className="text-yellow-500" size={22} />
            <div>
              <div className="text-2xl font-extrabold text-yellow-600">{filtrados.filter((s) => diasEnCampo(s.fecha) > 30).length}</div>
              <div className="text-xs text-slate-500">Con mas de 30 dias</div>
            </div>
          </div>
        </div>
        <select className="input !w-auto" value={zonaFiltro} onChange={(e) => setZonaFiltro(e.target.value)}>
          <option value="">Todas las zonas</option>
          {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
        </select>
      </div>

      {porJefe.length > 0 && (
        <div className="card mb-6">
          <h2 className="font-bold text-fester-blue mb-3">Resumen por jefe de cuadrilla</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {porJefe.map((j) => (
              <div key={j.nombre} className="rounded-lg border border-slate-200 px-4 py-3 flex items-center justify-between">
                <div className="font-semibold text-slate-800 text-sm">{j.nombre}</div>
                <div className="text-right">
                  <div className="text-xl font-extrabold text-fester-blue">{j.herramientas}</div>
                  <div className="text-xs text-slate-400">en campo</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-x-auto p-0">
        <div className="px-5 pt-4 pb-2">
          <h2 className="font-bold text-fester-blue">Detalle — que esta en campo ahora</h2>
        </div>
        {cargando ? (
          <p className="text-sm text-slate-400 px-5 py-8">Cargando...</p>
        ) : (
          <table className="w-full min-w-[640px]">
            <thead className="bg-slate-50 border-y border-slate-200">
              <tr>
                <th className="th">Folio</th>
                <th className="th">Fecha Salida</th>
                <th className="th">Jefe</th>
                <th className="th">Obra</th>
                <th className="th">Zona</th>
                <th className="th">Herramienta</th>
                <th className="th text-right">En Campo</th>
                <th className="th">Semaforo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map((s) => {
                const dias = diasEnCampo(s.fecha);
                const sem = semaforo(dias);
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="td font-bold text-fester-blue">{String(s.folio).padStart(4, '0')}</td>
                    <td className="td whitespace-nowrap">{fmtFecha(s.fecha)}</td>
                    <td className="td font-semibold">{s.perfiles?.nombre ?? '--'}</td>
                    <td className="td text-slate-600 text-sm">{s.obras?.nombre ?? '--'}</td>
                    <td className="td text-slate-500 text-sm">{s.zonas?.nombre ?? '--'}</td>
                    <td className="td">{s.herramientas?.nombre ?? '--'}</td>
                    <td className="td text-right font-bold text-fester-blue">{s.enCampo}</td>
                    <td className="td">
                      <span className={'rounded-full px-2 py-0.5 text-xs font-semibold ' + sem.cls}>
                        {dias}d — {sem.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={8} className="td text-center py-12">
                    <CheckCircle2 className="mx-auto mb-2 text-green-400" size={28} />
                    <span className="text-slate-400">Todo devuelto. No hay herramientas en campo.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </AdminGuard>
  );
}
