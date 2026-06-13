'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import PageTitle from '@/components/PageTitle';
import { fetchRegistros } from '@/lib/registros';
import { rangos, enRango, porAplicador } from '@/lib/analitica';
import { fmtNum } from '@/lib/format';
import type { Registro } from '@/types/db';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

type Periodo = 'semana' | 'mes' | 'anio';
const TABS: { id: Periodo; label: string }[] = [
  { id: 'semana', label: 'Esta semana' },
  { id: 'mes', label: 'Este mes' },
  { id: 'anio', label: 'Este año' },
];

export default function ProductividadPage() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>('semana');

  useEffect(() => {
    (async () => setRegistros(await fetchRegistros({ desde: rangos().anio.desde }, 10000)))();
  }, []);

  const stats = useMemo(() => {
    const r = rangos()[periodo];
    return porAplicador(registros.filter((x) => enRango(x, r.desde, r.hasta)));
  }, [registros, periodo]);

  return (
    <AdminGuard>
      <PageTitle title="Dashboard de Productividad" subtitle="Ranking de aplicadores por periodo" />

      <div className="mb-6 flex gap-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setPeriodo(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${periodo === t.id ? 'bg-fester-blue text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card mb-6">
        <h2 className="font-bold text-fester-blue mb-4">m² ejecutados por aplicador</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.slice(0, 12)} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" fontSize={12} />
              <YAxis type="category" dataKey="nombre" width={150} fontSize={11} />
              <Tooltip formatter={(v: any) => [`${fmtNum(Number(v))} m²`, 'Ejecutado']} />
              <Bar dataKey="m2" fill="#D6001C" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[700px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="th">#</th><th className="th">Aplicador</th>
              <th className="th text-right">m² ejecutados</th><th className="th text-right">Obras</th>
              <th className="th text-right">Horas</th><th className="th text-right">Promedio por obra</th>
              <th className="th text-right">m²/hora</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stats.map((a, i) => (
              <tr key={a.aplicador_id} className="hover:bg-slate-50">
                <td className="td font-bold text-slate-400">{i + 1}</td>
                <td className="td font-semibold">{i < 3 && <span className="mr-1">{['🥇','🥈','🥉'][i]}</span>}{a.nombre}</td>
                <td className="td text-right font-bold text-fester-blue">{fmtNum(a.m2)}</td>
                <td className="td text-right">{a.obras}</td>
                <td className="td text-right">{fmtNum(a.horas)}</td>
                <td className="td text-right">{fmtNum(a.promedioObra)}</td>
                <td className="td text-right">{fmtNum(a.m2PorHora)}</td>
              </tr>
            ))}
            {stats.length === 0 && <tr><td colSpan={7} className="td text-center text-slate-400 py-10">Sin registros en el periodo.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminGuard>
  );
}
