'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import PageTitle from '@/components/PageTitle';
import { fetchRegistros } from '@/lib/registros';
import { rangos, enRango, porAplicador, porMaterial, porZona, serieMensual, crecimientoMensual } from '@/lib/analitica';
import { fmtNum } from '@/lib/format';
import type { Registro } from '@/types/db';
import { AlertTriangle, Award, Brain, GraduationCap, Lightbulb, TrendingUp } from 'lucide-react';

interface Insight {
  tipo: 'logro' | 'dato' | 'alerta' | 'recomendacion' | 'tendencia';
  titulo: string;
  detalle: string;
}

const ICONOS = {
  logro: { Icon: Award, cls: 'bg-yellow-100 text-yellow-700' },
  dato: { Icon: Lightbulb, cls: 'bg-blue-100 text-fester-blue' },
  alerta: { Icon: AlertTriangle, cls: 'bg-red-100 text-fester-red' },
  recomendacion: { Icon: GraduationCap, cls: 'bg-purple-100 text-purple-700' },
  tendencia: { Icon: TrendingUp, cls: 'bg-green-100 text-green-700' },
};

function generarInsights(registros: Registro[]): Insight[] {
  const out: Insight[] = [];
  if (registros.length === 0) return out;
  const r = rangos();
  const regsSemana = registros.filter((x) => enRango(x, r.semana.desde, r.semana.hasta));
  const regsMes = registros.filter((x) => enRango(x, r.mes.desde, r.mes.hasta));

  // Aplicador más productivo de la semana y del mes
  const topSemana = porAplicador(regsSemana)[0];
  if (topSemana) out.push({ tipo: 'logro', titulo: 'Aplicador más productivo de la semana', detalle: `${topSemana.nombre} con ${fmtNum(topSemana.m2)} m² en ${topSemana.obras} obra(s).` });
  const topMes = porAplicador(regsMes)[0];
  if (topMes) out.push({ tipo: 'logro', titulo: 'Aplicador más productivo del mes', detalle: `${topMes.nombre} con ${fmtNum(topMes.m2)} m² y promedio de ${fmtNum(topMes.m2PorHora)} m²/hora.` });

  // Materiales más y menos utilizados
  const mats = porMaterial(registros);
  if (mats.length > 0) {
    out.push({ tipo: 'dato', titulo: 'Material más utilizado', detalle: `${mats[0].clave}: ${fmtNum(mats[0].m2)} m² en ${mats[0].registros} registro(s).` });
    if (mats.length > 1) {
      const ultimo = mats[mats.length - 1];
      out.push({ tipo: 'dato', titulo: 'Material menos utilizado', detalle: `${ultimo.clave}: solo ${fmtNum(ultimo.m2)} m². Evalúa promoción o capacitación en este sistema.` });
    }
  }

  // Zonas más y menos productivas (m²/h)
  const zonas = porZona(registros).map((z) => ({ ...z, prod: z.horas > 0 ? z.m2 / z.horas : 0 }));
  if (zonas.length > 0) {
    const masProd = [...zonas].sort((a, b) => b.prod - a.prod)[0];
    out.push({ tipo: 'dato', titulo: 'Zona más productiva', detalle: `${masProd.clave} con ${fmtNum(masProd.prod)} m²/hora y ${fmtNum(masProd.m2)} m² acumulados.` });
    if (zonas.length > 1) {
      const menosProd = [...zonas].sort((a, b) => a.prod - b.prod)[0];
      out.push({ tipo: 'alerta', titulo: 'Zona menos productiva', detalle: `${menosProd.clave} registra ${fmtNum(menosProd.prod)} m²/hora. Revisa cargas de trabajo y logística en la zona.` });
    }
  }

  // Obras con baja productividad (m²/h < 50% de la media global)
  const horasTot = registros.reduce((s, x) => s + Number(x.horas), 0);
  const m2Tot = registros.reduce((s, x) => s + Number(x.m2), 0);
  const mediaGlobal = horasTot > 0 ? m2Tot / horasTot : 0;
  const bajas = registros.filter((x) => Number(x.horas) > 0 && Number(x.m2) / Number(x.horas) < mediaGlobal * 0.5);
  if (bajas.length > 0 && mediaGlobal > 0) {
    out.push({
      tipo: 'alerta', titulo: `${bajas.length} obra(s) con baja productividad`,
      detalle: `Por debajo del 50% de la media global (${fmtNum(mediaGlobal)} m²/h). Ejemplos: ${bajas.slice(0, 3).map((x) => `"${x.obras?.nombre}" (${fmtNum(Number(x.m2) / Number(x.horas))} m²/h)`).join(', ')}.`,
    });
  }

  // Tendencia de crecimiento
  const crec = crecimientoMensual(registros);
  if (crec !== null) {
    out.push({
      tipo: 'tendencia',
      titulo: crec >= 0 ? `Crecimiento mensual de ${fmtNum(crec)}%` : `Caída mensual de ${fmtNum(Math.abs(crec))}%`,
      detalle: crec >= 0
        ? 'Los m² ejecutados este mes superan al mes anterior. La operación va en ascenso.'
        : 'Los m² ejecutados este mes están por debajo del mes anterior. Revisa pipeline de obras y disponibilidad de aplicadores.',
    });
  }
  const serie = serieMensual(registros, 3);
  if (serie.length === 3 && serie[0].m2 > 0 && serie[1].m2 > serie[0].m2 && serie[2].m2 > serie[1].m2) {
    out.push({ tipo: 'tendencia', titulo: 'Tres meses consecutivos de crecimiento', detalle: `${serie.map((s) => `${s.etiqueta}: ${fmtNum(s.m2)} m²`).join(' → ')}.` });
  }

  // Alertas operativas: aplicadores sin actividad esta semana
  const activosSemana = new Set(regsSemana.map((x) => x.aplicador_id));
  const activosMes = new Set(regsMes.map((x) => x.aplicador_id));
  const inactivos = [...activosMes].filter((id) => !activosSemana.has(id));
  if (inactivos.length > 0) {
    const nombres = registros.filter((x) => inactivos.includes(x.aplicador_id)).map((x) => x.aplicadores?.nombre_completo).filter(Boolean);
    out.push({ tipo: 'alerta', titulo: `${inactivos.length} aplicador(es) sin registros esta semana`, detalle: `Trabajaron este mes pero no esta semana: ${[...new Set(nombres)].slice(0, 5).join(', ')}.` });
  }

  // Recomendaciones de capacitación: aplicadores 30% debajo de la media
  const statsApl = porAplicador(registros).filter((a) => a.horas >= 8);
  const rezagados = statsApl.filter((a) => a.m2PorHora < mediaGlobal * 0.7);
  if (rezagados.length > 0 && mediaGlobal > 0) {
    out.push({
      tipo: 'recomendacion', titulo: 'Recomendación de capacitación',
      detalle: `${rezagados.map((a) => a.nombre).slice(0, 5).join(', ')} ${rezagados.length === 1 ? 'está' : 'están'} más de 30% por debajo de la productividad media (${fmtNum(mediaGlobal)} m²/h). Considera entrenamiento técnico o acompañamiento en obra.`,
    });
  }

  return out;
}

export default function InteligenciaPage() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => { setRegistros(await fetchRegistros({}, 10000)); setCargando(false); })();
  }, []);

  const insights = useMemo(() => generarInsights(registros), [registros]);

  return (
    <AdminGuard>
      <PageTitle title="Inteligencia Operativa" subtitle="Análisis automático generado a partir de los registros capturados" />

      {cargando && <p className="text-sm text-slate-500">Analizando datos…</p>}
      {!cargando && insights.length === 0 && (
        <div className="card text-center py-14 text-slate-400">
          <Brain className="mx-auto mb-3" size={36} />
          Aún no hay suficientes datos para generar análisis. Captura actividades y vuelve aquí.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {insights.map((ins, i) => {
          const { Icon, cls } = ICONOS[ins.tipo];
          return (
            <div key={i} className="card flex gap-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${cls}`}>
                <Icon size={20} />
              </div>
              <div>
                <div className="font-bold text-slate-800">{ins.titulo}</div>
                <div className="mt-0.5 text-sm text-slate-500">{ins.detalle}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AdminGuard>
  );
}
