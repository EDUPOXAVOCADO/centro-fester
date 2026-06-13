'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase-browser';
import AdminGuard from '@/components/AdminGuard';
import PageTitle from '@/components/PageTitle';
import type { Categoria, Garantia, Material, Zona } from '@/types/db';
import { Plus } from 'lucide-react';

export default function MaterialesPage() {
  const supabase = getSupabase();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [nuevoMat, setNuevoMat] = useState({ categoria_id: '', nombre: '' });
  const [nuevaGar, setNuevaGar] = useState({ material_id: '', etiqueta: '' });
  const [nuevaZona, setNuevaZona] = useState('');
  const [msg, setMsg] = useState('');

  const cargar = useCallback(async () => {
    const [c, m, g, z] = await Promise.all([
      supabase.from('categorias').select('*').order('orden'),
      supabase.from('materiales').select('*').order('nombre'),
      supabase.from('garantias').select('*').order('orden'),
      supabase.from('zonas').select('*').order('nombre'),
    ]);
    setCategorias((c.data as Categoria[]) ?? []);
    setMateriales((m.data as Material[]) ?? []);
    setGarantias((g.data as Garantia[]) ?? []);
    setZonas((z.data as Zona[]) ?? []);
  }, [supabase]);

  useEffect(() => { cargar(); }, [cargar]);

  async function run(p: PromiseLike<{ error: any }>)
    setMsg('');
    const { error } = await p;
    if (error) setMsg(error.message);
    cargar();
  }

  return (
    <AdminGuard>
      <PageTitle title="Materiales y Zonas" subtitle="Catálogos del sistema — sin texto libre en la captura" />
      {msg && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-fester-red">{msg}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-bold text-fester-blue mb-3">Materiales por categoría</h2>
          <form className="flex flex-wrap gap-2 mb-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!nuevoMat.categoria_id || !nuevoMat.nombre.trim()) return;
              run(supabase.from('materiales').insert({ categoria_id: Number(nuevoMat.categoria_id), nombre: nuevoMat.nombre.trim() }));
              setNuevoMat({ categoria_id: nuevoMat.categoria_id, nombre: '' });
            }}>
            <select className="input !w-auto flex-1 min-w-[180px]" value={nuevoMat.categoria_id}
              onChange={(e) => setNuevoMat({ ...nuevoMat, categoria_id: e.target.value })} required>
              <option value="">Categoría…</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <input className="input !w-auto flex-1 min-w-[160px]" placeholder="Nuevo material"
              value={nuevoMat.nombre} onChange={(e) => setNuevoMat({ ...nuevoMat, nombre: e.target.value })} required />
            <button className="btn-primary"><Plus size={16} /> Agregar</button>
          </form>
          <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
            {categorias.map((c) => (
              <div key={c.id}>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">{c.nombre}</div>
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {materiales.filter((m) => m.categoria_id === c.id).map((m) => (
                    <li key={m.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className={m.activo ? '' : 'line-through text-slate-400'}>
                        {m.nombre}
                        {garantias.some((g) => g.material_id === m.id) && (
                          <span className="ml-2 text-xs text-slate-400">
                            ({garantias.filter((g) => g.material_id === m.id).map((g) => g.etiqueta).join(', ')})
                          </span>
                        )}
                      </span>
                      <button className="text-xs font-semibold text-fester-blue hover:underline"
                        onClick={() => run(supabase.from('materiales').update({ activo: !m.activo }).eq('id', m.id))}>
                        {m.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="font-bold text-fester-blue mb-3">Garantías / Espesores</h2>
            <form className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!nuevaGar.material_id || !nuevaGar.etiqueta.trim()) return;
                run(supabase.from('garantias').insert({ material_id: Number(nuevaGar.material_id), etiqueta: nuevaGar.etiqueta.trim() }));
                setNuevaGar({ material_id: nuevaGar.material_id, etiqueta: '' });
              }}>
              <select className="input !w-auto flex-1 min-w-[180px]" value={nuevaGar.material_id}
                onChange={(e) => setNuevaGar({ ...nuevaGar, material_id: e.target.value })} required>
                <option value="">Material…</option>
                {materiales.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
              <input className="input !w-auto flex-1 min-w-[120px]" placeholder='ej. "5 años" o "4.5 mm"'
                value={nuevaGar.etiqueta} onChange={(e) => setNuevaGar({ ...nuevaGar, etiqueta: e.target.value })} required />
              <button className="btn-primary"><Plus size={16} /> Agregar</button>
            </form>
          </div>

          <div className="card">
            <h2 className="font-bold text-fester-blue mb-3">Zonas</h2>
            <form className="flex gap-2 mb-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!nuevaZona.trim()) return;
                run(supabase.from('zonas').insert({ nombre: nuevaZona.trim() }));
                setNuevaZona('');
              }}>
              <input className="input" placeholder="Nueva zona" value={nuevaZona} onChange={(e) => setNuevaZona(e.target.value)} required />
              <button className="btn-primary"><Plus size={16} /></button>
            </form>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {zonas.map((z) => (
                <li key={z.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className={z.activo ? '' : 'line-through text-slate-400'}>{z.nombre}</span>
                  <button className="text-xs font-semibold text-fester-blue hover:underline"
                    onClick={() => run(supabase.from('zonas').update({ activo: !z.activo }).eq('id', z.id))}>
                    {z.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
