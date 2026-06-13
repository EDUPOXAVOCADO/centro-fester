'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase-browser';
import AdminGuard from '@/components/AdminGuard';
import PageTitle from '@/components/PageTitle';
import KpiCard from '@/components/KpiCard';
import Logo from '@/components/Logo';
import { fetchRegistros } from '@/lib/registros';
import { rangos, enRango, serieSemanal, porAplicador } from '@/lib/analitica';
import { fmtNum } from '@/lib/format';
import type { Registro } from '@/types/db';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function DashboardPage() {
  const supabase = getSupabase();
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [aplicadoresActivos, setAplicadoresActivos] = useState(0);

  useEffect(() => {
    (async () => {
      const r = rangos();
      const [regs, apls] = await Promise.all([
        fetchRegistros({ desde: r.anio.desde }, 10000),
        supabase.from('aplicadores').select('id', { count: 'exact', head: true }).eq('activo', true),
      ]);
      setRegistros(regs);
      setAplicadoresActivos(apls.count ?? 0);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const r = rangos();
  const m2 = (desde: string, hasta: string) =>
    registros.filter((x) => enRango(x, desde, hasta)).reduce((s, x) => s + Number(x.m2), 0);
  const m2Semana = m2(r.semana.desde, r.semana.hasta);
  const m2Mes = m2(r.mes.desde, r.mes.hasta);
  const m2Anio = m2(r.anio.desde, r.anio.hasta);
  const obras = new Set(registros.map((x) => x.obra_id)).size;
  const horas = registros.reduce((s, x) => s + Number(x.horas), 0);
  const productividad = horas > 0 ? m2Anio / horas : 0;
  const serie = serieSemanal(registros, 12);
  const topMes = porAplicador(registros.filter((x) => enRango(x, r.mes.desde, r.mes.hasta))).slice(0, 5);

  return (
    <AdminGuard>
      <div className="mb-6 flex items-center justify-between">
        <PageTitle title="Dashboard Ejecutivo" subtitle="Resumen general de operación" />
        <div className="hidden md:block"><Logo size={36} /></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
        <KpiCard titulo="m² esta semana" valor={fmtNum(m2Semana)} acento />
        <KpiCard titulo="m² este mes" valor={fmtNum(m2Mes)} />
        <KpiCard titulo="m² este año" valor={fmtNum(m2Anio)} />
        <KpiCard titulo="Aplicadores activos" valor={String(aplicadoresActivos)} />
        <KpiCard titulo="Obras registradas" valor={String(obras)} sub="en el año" />
        <KpiCard titulo="Productividad media" valor={fmtNum(productividad)} sub="m² por hora" acento />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="font-bold text-fester-blue mb-4">m² ejecutados por semana (últimas 12)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serie}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="etiqueta" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: any) => [`${fmtNum(Number(v))} m²`, 'Ejecutado']} />
                <Bar dataKey="m2" fill="#003B7A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h2 className="font-bold text-fester-blue mb-4">Top aplicadores del mes</h2>
          <div className="space-y-3">
            {topMes.map((a, i) => (
              <div key={a.aplicador_id} className="flex items-center gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${i === 0 ? 'bg-fester-red' : 'bg-fester-blue'}`}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{a.nombre}</div>
                  <div className="text-xs text-slate-400">{a.obras} obras · {fmtNum(a.horas)} h</div>
                </div>
                <div className="font-bold text-fester-blue text-sm">{fmtNum(a.m2)} m²</div>
              </div>
            ))}
            {topMes.length === 0 && <p className="text-sm text-slate-400">Sin registros este mes.</p>}
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
