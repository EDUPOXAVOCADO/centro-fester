import { startOfWeek, endOfWeek, startOfMonth, startOfYear, format, subWeeks, subMonths } from 'date-fns';
import type { Registro } from '@/types/db';
import { claveMaterial } from '@/lib/registros';

export const iso = (d: Date) => format(d, 'yyyy-MM-dd');

export function rangos(hoy = new Date()) {
  return {
    semana: { desde: iso(startOfWeek(hoy, { weekStartsOn: 1 })), hasta: iso(endOfWeek(hoy, { weekStartsOn: 1 })) },
    mes: { desde: iso(startOfMonth(hoy)), hasta: iso(hoy) },
    anio: { desde: iso(startOfYear(hoy)), hasta: iso(hoy) },
  };
}

export const enRango = (r: Registro, desde: string, hasta: string) => r.fecha >= desde && r.fecha <= hasta;

export interface StatAplicador {
  aplicador_id: number;
  nombre: string;
  m2: number;
  obras: number;
  horas: number;
  registros: number;
  promedioObra: number;   // m² por obra
  m2PorHora: number;
}

export function porAplicador(registros: Registro[]): StatAplicador[] {
  const map = new Map<number, StatAplicador & { obraSet: Set<number> }>();
  for (const r of registros) {
    const k = r.aplicador_id;
    if (!map.has(k)) {
      map.set(k, { aplicador_id: k, nombre: r.aplicadores?.nombre_completo ?? `#${k}`, m2: 0, obras: 0, horas: 0, registros: 0, promedioObra: 0, m2PorHora: 0, obraSet: new Set() });
    }
    const s = map.get(k)!;
    s.m2 += Number(r.m2);
    s.horas += Number(r.horas);
    s.registros += 1;
    s.obraSet.add(r.obra_id);
  }
  return [...map.values()]
    .map(({ obraSet, ...s }) => ({
      ...s,
      obras: obraSet.size,
      promedioObra: obraSet.size > 0 ? s.m2 / obraSet.size : 0,
      m2PorHora: s.horas > 0 ? s.m2 / s.horas : 0,
    }))
    .sort((a, b) => b.m2 - a.m2);
}

export interface StatGrupo { clave: string; m2: number; obras: number; horas: number; registros: number; }

export function agrupar(registros: Registro[], keyFn: (r: Registro) => string): StatGrupo[] {
  const map = new Map<string, StatGrupo & { obraSet: Set<number> }>();
  for (const r of registros) {
    const k = keyFn(r);
    if (!map.has(k)) map.set(k, { clave: k, m2: 0, obras: 0, horas: 0, registros: 0, obraSet: new Set() });
    const s = map.get(k)!;
    s.m2 += Number(r.m2);
    s.horas += Number(r.horas);
    s.registros += 1;
    s.obraSet.add(r.obra_id);
  }
  return [...map.values()].map(({ obraSet, ...s }) => ({ ...s, obras: obraSet.size })).sort((a, b) => b.m2 - a.m2);
}

export const porZona = (rs: Registro[]) => agrupar(rs, (r) => r.zonas?.nombre ?? '—');
// IMPORTANTE: material + garantía como unidad — nunca se mezclan materiales
export const porMaterial = (rs: Registro[]) => agrupar(rs, claveMaterial);

// Series de tendencia
export function serieSemanal(registros: Registro[], semanas = 12, hoy = new Date()) {
  const out: { etiqueta: string; desde: string; hasta: string; m2: number }[] = [];
  for (let i = semanas - 1; i >= 0; i--) {
    const ini = startOfWeek(subWeeks(hoy, i), { weekStartsOn: 1 });
    const fin = endOfWeek(ini, { weekStartsOn: 1 });
    const desde = iso(ini), hasta = iso(fin);
    out.push({
      etiqueta: format(ini, 'dd/MM'),
      desde, hasta,
      m2: registros.filter((r) => enRango(r, desde, hasta)).reduce((s, r) => s + Number(r.m2), 0),
    });
  }
  return out;
}

export function serieMensual(registros: Registro[], meses = 12, hoy = new Date()) {
  const out: { etiqueta: string; m2: number }[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    const d = subMonths(hoy, i);
    const pref = format(d, 'yyyy-MM');
    out.push({
      etiqueta: format(d, 'MM/yy'),
      m2: registros.filter((r) => r.fecha.startsWith(pref)).reduce((s, r) => s + Number(r.m2), 0),
    });
  }
  return out;
}

export function serieAnual(registros: Registro[]) {
  const map = new Map<string, number>();
  for (const r of registros) {
    const y = r.fecha.slice(0, 4);
    map.set(y, (map.get(y) ?? 0) + Number(r.m2));
  }
  return [...map.entries()].sort().map(([etiqueta, m2]) => ({ etiqueta, m2 }));
}

export function crecimientoMensual(registros: Registro[], hoy = new Date()): number | null {
  const act = format(hoy, 'yyyy-MM');
  const ant = format(subMonths(hoy, 1), 'yyyy-MM');
  const m2Act = registros.filter((r) => r.fecha.startsWith(act)).reduce((s, r) => s + Number(r.m2), 0);
  const m2Ant = registros.filter((r) => r.fecha.startsWith(ant)).reduce((s, r) => s + Number(r.m2), 0);
  if (m2Ant === 0) return null;
  return ((m2Act - m2Ant) / m2Ant) * 100;
}
