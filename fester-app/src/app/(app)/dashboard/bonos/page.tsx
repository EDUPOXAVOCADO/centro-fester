'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase-browser';
import AdminGuard from '@/components/AdminGuard';
import PageTitle from '@/components/PageTitle';
import { fetchRegistros, claveMaterial } from '@/lib/registros';
import { iso, porAplicador } from '@/lib/analitica';
import { fmtFecha, fmtNum } from '@/lib/format';
import type { Aplicador, Bono, Registro } from '@/types/db';
import { addWeeks, endOfWeek, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Save, Trophy } from 'lucide-react';

const MEDALLAS = ['🥇', '🥈', '🥉'];
const TITULOS = ['Primer Lugar', 'Segundo Lugar', 'Tercer Lugar'];

export default function BonosPage() {
  const supabase = getSupabase();
  const [offset, setOffset] = useState(0); // semanas hacia atrás
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [aplicadores, setAplicadores] = useState<Aplicador[]>([]);
  const [historial, setHistorial] = useState<Bono[]>([]);
  const [msg, setMsg] = useState('');

  const semana = useMemo(() => {
    const base = addWeeks(new Date(), -offset);
    const ini = startOfWeek(base, { weekStartsOn: 1 });
    const fin = endOfWeek(base, { weekStartsOn: 1 });
    return { desde: iso(ini), hasta: iso(fin) };
  }, [offset]);

  const cargar = useCallback(async () => {
    const [regs, apls, hist] = await Promise.all([
      fetchRegistros({ desde: semana.desde, hasta: semana.hasta }, 10000),
      supabase.from('aplicadores').select('*, zonas(nombre)'),
      supabase.from('bonos').select('*, aplicadores(nombre_completo, foto_url, zonas(nombre))')
        .order('semana_inicio', { ascending: false }).order('lugar').limit(30),
    ]);
    setRegistros(regs);
    setAplicadores((apls.data as Aplicador[]) ?? []);
    setHistorial((hist.data as unknown as Bono[]) ?? []);
  }, [semana, supabase]);

  useEffect(() => { cargar(); }, [cargar]);

  const top3 = useMemo(() => {
    return porAplicador(registros).slice(0, 3).map((s) => {
      const regsAp = registros.filter((r) => r.aplicador_id === s.aplicador_id);
      const matCount = new Map<string, number>();
      regsAp.forEach((r) => {
        const k = claveMaterial(r);
        matCount.set(k, (matCount.get(k) ?? 0) + Number(r.m2));
      });
      const materialPrincipal = [...matCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
      const ap = aplicadores.find((a) => a.id === s.aplicador_id);
      return { ...s, materialPrincipal, foto: ap?.foto_url ?? null, zona: ap?.zonas?.nombre ?? '—' };
    });
  }, [registros, aplicadores]);

  async function guardarGanadores() {
    setMsg('');
    if (top3.length === 0) { setMsg('No hay registros en esta semana.'); return; }
    // Reemplazar ganadores de la semana
    await supabase.from('bonos').delete().eq('semana_inicio', semana.desde);
    const { error } = await supabase.from('bonos').insert(
      top3.map((t, i) => ({
        semana_inicio: semana.desde,
        semana_fin: semana.hasta,
        lugar: i + 1,
        aplicador_id: t.aplicador_id,
        m2: t.m2,
        material_principal: t.materialPrincipal,
      }))
    );
    setMsg(error ? error.message : 'Ganadores de la semana guardados.');
    cargar();
  }

  function Inicial({ nombre }: { nombre: string }) {
    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-fester-blue text-2xl font-extrabold text-white">
        {nombre.split(' ').slice(0, 2).map((p) => p[0]).join('')}
      </div>
    );
  }

  return (
    <AdminGuard>
      <PageTitle title="Dashboard de Bonos" subtitle="Ganadores del bono semanal — generación automática por m² ejecutados" />

      <div className="card mb-6 bg-gradient-to-r from-fester-blue to-fester-blue-dark !border-0">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-white">
            <Trophy className="text-yellow-400" /> GANADORES DEL BONO SEMANAL
          </h2>
          <div className="flex items-center gap-2 text-white text-sm font-semibold">
            <button className="rounded-lg bg-white/15 p-1.5 hover:bg-white/25" onClick={() => setOffset(offset + 1)}><ChevronLeft size={18} /></button>
            <span>{fmtFecha(semana.desde)} — {fmtFecha(semana.hasta)}</span>
            <button className="rounded-lg bg-white/15 p-1.5 hover:bg-white/25 disabled:opacity-40" disabled={offset === 0} onClick={() => setOffset(offset - 1)}><ChevronRight size={18} /></button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 0, 2].map((idx) => {
            const t = top3[idx];
            const esPrimero = idx === 0;
            return (
              <div key={idx} className={`rounded-xl bg-white p-5 text-center ${esPrimero ? 'sm:-mt-3 ring-4 ring-yellow-400' : 'sm:mt-3'}`}>
                <div className="text-3xl mb-2">{MEDALLAS[idx]}</div>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">{TITULOS[idx]}</div>
                {t ? (
                  <>
                    <div className="flex justify-center mb-3">
                      {t.foto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.foto} alt={t.nombre} className="h-20 w-20 rounded-full object-cover border-4 border-fester-blue" />
                      ) : <Inicial nombre={t.nombre} />}
                    </div>
                    <div className="font-extrabold text-fester-blue">{t.nombre}</div>
                    <div className="text-xs text-slate-500 mb-2">{t.zona}</div>
                    <div className="text-2xl font-extrabold text-fester-red">{fmtNum(t.m2)} m²</div>
                    <div className="mt-1 text-xs font-medium text-slate-500">{t.materialPrincipal}</div>
                  </>
                ) : <div className="py-8 text-sm text-slate-300">Sin datos</div>}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button className="btn-danger" onClick={guardarGanadores}><Save size={16} /> Guardar ganadores de esta semana</button>
          {msg && <span className="text-sm font-medium text-white">{msg}</span>}
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <div className="px-5 pt-5 pb-2"><h2 className="font-bold text-fester-blue">Historial de bonos otorgados</h2></div>
        <table className="w-full min-w-[640px]">
          <thead className="bg-slate-50 border-y border-slate-200">
            <tr><th className="th">Semana</th><th className="th">Lugar</th><th className="th">Aplicador</th><th className="th">Zona</th><th className="th text-right">m²</th><th className="th">Material principal</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {historial.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50">
                <td className="td whitespace-nowrap">{fmtFecha(b.semana_inicio)} — {fmtFecha(b.semana_fin)}</td>
                <td className="td">{MEDALLAS[b.lugar - 1]} {b.lugar}°</td>
                <td className="td font-semibold">{(b.aplicadores as any)?.nombre_completo}</td>
                <td className="td">{(b.aplicadores as any)?.zonas?.nombre ?? '—'}</td>
                <td className="td text-right font-bold text-fester-blue">{fmtNum(Number(b.m2))}</td>
                <td className="td">{b.material_principal}</td>
              </tr>
            ))}
            {historial.length === 0 && <tr><td colSpan={6} className="td text-center text-slate-400 py-8">Aún no se han guardado bonos.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminGuard>
  );
}
