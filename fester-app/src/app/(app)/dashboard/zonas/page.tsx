'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import PageTitle from '@/components/PageTitle';
import { fetchRegistros } from '@/lib/registros';
import { agrupar, crecimientoMensual } from '@/lib/analitica';
import { fmtNum } from '@/lib/format';
import type { Registro } from '@/types/db';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function ZonasDashboardPage() {
  const [registros, setRegistros] = useState<Registro[]>([]);

  useEffect(() => { (async () => setRegistros(await fetchRegistros({}, 10000)))(); }, []);

  const datos = useMemo(() => {
    const grupos = agrupar(registros, (r) => r.zonas?.nombre ?? '—');
    return grupos.map((g) => {
      const regsZona = registros.filter((r) => (r.zonas?.nombre ?? '—') === g.clave);
      const crec = crecimientoMensual(regsZona);
      return {
        ...g,
        productividad: g.horas > 0 ? g.m2 / g.horas : 0,
        crecimiento: crec,
      };
    });
  }, [registros]);

  return (
    <AdminGuard>
      <PageTitle title="Dashboard por Zona" subtitle="Comparativo de las zonas de operación" />

      <div className="card mb-6">
        <h2 className="font-bold text-fester-blue mb-4">m² ejecutados por zona (histórico)</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datos}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="clave" fontSize={11} interval={0} angle={-12} textAnchor="end" height={50} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v: any) => [`${fmtNum(Number(v))} m²`, 'Ejecutado']} />
              <Bar dataKey="m2" fill="#003B7A" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[640px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="th">Zona</th><th className="th text-right">m² ejecutados</th>
              <th className="th text-right">Obras</th><th className="th text-right">Productividad media (m²/h)</th>
              <th className="th text-right">Crecimiento mensual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {datos.map((z) => (
              <tr key={z.clave} className="hover:bg-slate-50">
                <td className="td font-semibold">{z.clave}</td>
                <td className="td text-right font-bold text-fester-blue">{fmtNum(z.m2)}</td>
                <td className="td text-right">{z.obras}</td>
                <td className="td text-right">{fmtNum(z.productividad)}</td>
                <td className="td text-right">
                  {z.crecimiento === null ? <span className="text-slate-400">—</span> : (
                    <span className={`font-bold ${z.crecimiento >= 0 ? 'text-green-600' : 'text-fester-red'}`}>
                      {z.crecimiento >= 0 ? '▲' : '▼'} {fmtNum(Math.abs(z.crecimiento))}%
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {datos.length === 0 && <tr><td colSpan={5} className="td text-center text-slate-400 py-10">Sin registros.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminGuard>
  );
}
