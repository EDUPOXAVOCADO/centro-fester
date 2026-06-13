'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import PageTitle from '@/components/PageTitle';
import Filtros from '@/components/Filtros';
import KpiCard from '@/components/KpiCard';
import { fetchRegistros, claveMaterial, type FiltrosRegistros } from '@/lib/registros';
import { porAplicador, porMaterial, serieSemanal, serieMensual, serieAnual } from '@/lib/analitica';
import { fmtNum } from '@/lib/format';
import type { Registro } from '@/types/db';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

type Tendencia = 'semanal' | 'mensual' | 'anual';

export default function MaterialesDashboardPage() {
  const [filtros, setFiltros] = useState<FiltrosRegistros>({});
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [tendencia, setTendencia] = useState<Tendencia>('semanal');

  const cargar = useCallback(async () => setRegistros(await fetchRegistros(filtros, 10000)), [filtros]);
  useEffect(() => { cargar(); }, [cargar]);

  // Regla de negocio: NO mezclar materiales.
  // El ranking de aplicadores solo se muestra cuando se ha elegido un material específico
  // (y su garantía/espesor, si aplica), de modo que la comparación sea entre iguales.
  const grupos = useMemo(() => porMaterial(registros), [registros]);
  const materialSeleccionado = Boolean(filtros.material_id);
  const variantesDelMaterial = useMemo(
    () => new Set(registros.map(claveMaterial)),
    [registros]
  );
  const comparacionValida = materialSeleccionado && variantesDelMaterial.size <= 1;
  const ranking = useMemo(
    () => (comparacionValida ? porAplicador(registros) : []),
    [comparacionValida, registros]
  );

  const totalM2 = registros.reduce((s, r) => s + Number(r.m2), 0);
  const serie = tendencia === 'semanal' ? serieSemanal(registros, 12)
    : tendencia === 'mensual' ? serieMensual(registros, 12)
    : serieAnual(registros);

  return (
    <AdminGuard>
      <PageTitle title="Dashboard por Material" subtitle="Análisis sin mezclar materiales: cada material y garantía se compara solo contra sí mismo" />
      <Filtros value={filtros} onChange={setFiltros} />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <KpiCard titulo="m² ejecutados" valor={fmtNum(totalM2)} acento />
        <KpiCard titulo="Registros" valor={String(registros.length)} />
        <KpiCard titulo="Variantes de material" valor={String(variantesDelMaterial.size)} sub="material + garantía" />
      </div>

      <div className="card mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="font-bold text-fester-blue">Tendencia de m² ejecutados</h2>
          <div className="flex gap-2">
            {(['semanal', 'mensual', 'anual'] as Tendencia[]).map((t) => (
              <button key={t} onClick={() => setTendencia(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${tendencia === t ? 'bg-fester-blue text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={serie}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="etiqueta" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v: any) => [`${fmtNum(Number(v))} m²`, 'Ejecutado']} />
              <Line type="monotone" dataKey="m2" stroke="#D6001C" strokeWidth={2.5} dot={{ fill: '#003B7A', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-0 overflow-x-auto">
          <div className="px-5 pt-5 pb-2">
            <h2 className="font-bold text-fester-blue">m² por material (con los filtros actuales)</h2>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50 border-y border-slate-200">
              <tr><th className="th">Material + Garantía</th><th className="th text-right">m²</th><th className="th text-right">Obras</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grupos.map((g) => (
                <tr key={g.clave} className="hover:bg-slate-50">
                  <td className="td font-medium">{g.clave}</td>
                  <td className="td text-right font-bold text-fester-blue">{fmtNum(g.m2)}</td>
                  <td className="td text-right">{g.obras}</td>
                </tr>
              ))}
              {grupos.length === 0 && <tr><td colSpan={3} className="td text-center text-slate-400 py-8">Sin datos.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card p-0 overflow-x-auto">
          <div className="px-5 pt-5 pb-2">
            <h2 className="font-bold text-fester-blue">Ranking de aplicadores — mismo material</h2>
            {!comparacionValida && (
              <p className="text-xs text-slate-500 mt-1">
                Selecciona un <strong>material</strong> (y su garantía/espesor si aplica) en los filtros para comparar aplicadores
                entre iguales. Ej.: Acriton 8 años solo contra Acriton 8 años; APP 4.5 mm solo contra APP 4.5 mm.
              </p>
            )}
          </div>
          {comparacionValida && (
            <table className="w-full">
              <thead className="bg-slate-50 border-y border-slate-200">
                <tr><th className="th">#</th><th className="th">Aplicador</th><th className="th text-right">m²</th><th className="th text-right">Obras</th><th className="th text-right">m²/h</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ranking.map((a, i) => (
                  <tr key={a.aplicador_id} className="hover:bg-slate-50">
                    <td className="td font-bold text-slate-400">{i + 1}</td>
                    <td className="td font-semibold">{a.nombre}</td>
                    <td className="td text-right font-bold text-fester-blue">{fmtNum(a.m2)}</td>
                    <td className="td text-right">{a.obras}</td>
                    <td className="td text-right">{fmtNum(a.m2PorHora)}</td>
                  </tr>
                ))}
                {ranking.length === 0 && <tr><td colSpan={5} className="td text-center text-slate-400 py-8">Sin registros para este material.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
