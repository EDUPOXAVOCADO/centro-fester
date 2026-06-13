'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase-browser';
import type { Aplicador, Categoria, Garantia, Material, Zona } from '@/types/db';
import type { FiltrosRegistros } from '@/lib/registros';

export default function Filtros({
  value, onChange, mostrar = ['fechas', 'categoria', 'material', 'garantia', 'zona', 'aplicador'],
}: {
  value: FiltrosRegistros;
  onChange: (f: FiltrosRegistros) => void;
  mostrar?: string[];
}) {
  const supabase = getSupabase();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [aplicadores, setAplicadores] = useState<Aplicador[]>([]);

  useEffect(() => {
    (async () => {
      const [c, m, g, z, a] = await Promise.all([
        supabase.from('categorias').select('*').order('orden'),
        supabase.from('materiales').select('*').order('nombre'),
        supabase.from('garantias').select('*').order('orden'),
        supabase.from('zonas').select('*').order('nombre'),
        supabase.from('aplicadores').select('*').order('nombre_completo'),
      ]);
      setCategorias((c.data as Categoria[]) ?? []);
      setMateriales((m.data as Material[]) ?? []);
      setGarantias((g.data as Garantia[]) ?? []);
      setZonas((z.data as Zona[]) ?? []);
      setAplicadores((a.data as Aplicador[]) ?? []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const materialesFiltrados = useMemo(
    () => (value.categoria_id ? materiales.filter((m) => m.categoria_id === value.categoria_id) : materiales),
    [materiales, value.categoria_id]
  );
  const garantiasFiltradas = useMemo(
    () => (value.material_id ? garantias.filter((g) => g.material_id === value.material_id) : []),
    [garantias, value.material_id]
  );

  const num = (s: string) => (s ? Number(s) : undefined);

  return (
    <div className="card mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {mostrar.includes('fechas') && (
        <>
          <div>
            <label className="label">Desde</label>
            <input className="input" type="date" value={value.desde ?? ''}
              onChange={(e) => onChange({ ...value, desde: e.target.value || undefined })} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input className="input" type="date" value={value.hasta ?? ''}
              onChange={(e) => onChange({ ...value, hasta: e.target.value || undefined })} />
          </div>
        </>
      )}
      {mostrar.includes('categoria') && (
        <div>
          <label className="label">Categoría</label>
          <select className="input" value={value.categoria_id ?? ''}
            onChange={(e) => onChange({ ...value, categoria_id: num(e.target.value), material_id: undefined, garantia_id: undefined })}>
            <option value="">Todas</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
      )}
      {mostrar.includes('material') && (
        <div>
          <label className="label">Material</label>
          <select className="input" value={value.material_id ?? ''}
            onChange={(e) => onChange({ ...value, material_id: num(e.target.value), garantia_id: undefined })}>
            <option value="">Todos</option>
            {materialesFiltrados.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </div>
      )}
      {mostrar.includes('garantia') && (
        <div>
          <label className="label">Garantía</label>
          <select className="input" value={value.garantia_id ?? ''} disabled={garantiasFiltradas.length === 0}
            onChange={(e) => onChange({ ...value, garantia_id: num(e.target.value) })}>
            <option value="">{garantiasFiltradas.length ? 'Todas' : '—'}</option>
            {garantiasFiltradas.map((g) => <option key={g.id} value={g.id}>{g.etiqueta}</option>)}
          </select>
        </div>
      )}
      {mostrar.includes('zona') && (
        <div>
          <label className="label">Zona</label>
          <select className="input" value={value.zona_id ?? ''}
            onChange={(e) => onChange({ ...value, zona_id: num(e.target.value) })}>
            <option value="">Todas</option>
            {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
          </select>
        </div>
      )}
      {mostrar.includes('aplicador') && (
        <div>
          <label className="label">Aplicador</label>
          <select className="input" value={value.aplicador_id ?? ''}
            onChange={(e) => onChange({ ...value, aplicador_id: num(e.target.value) })}>
            <option value="">Todos</option>
            {aplicadores.map((a) => <option key={a.id} value={a.id}>{a.nombre_completo}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
