'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase-browser';
import { usePerfil } from '@/components/PerfilContext';
import PageTitle from '@/components/PageTitle';
import { fmtFecha } from '@/lib/format';
import { Package } from 'lucide-react';

interface SalidaRaw {
  id: number; folio: number; fecha: string; cantidad: number;
  obras?: { nombre: string } | null;
  zonas?: { nombre: string } | null;
  herramientas?: { nombre: string } | null;
  devoluciones_herramientas?: { cantidad_devuelta: number }[];
}

export default function MisHerramientasPage() {
  const supabase = getSupabase();
  const perfil = usePerfil();
  const [salidas, setSalidas] = useState<SalidaRaw[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('salidas_herramientas')
      .select('*, obras(nombre), zonas(nombre), herramientas(nombre), devoluciones_herramientas(cantidad_devuelta)')
      .eq('encargado_id', user!.id)
      .order('folio', { ascending: false });
    setSalidas((data as SalidaRaw[]) ?? []);
    setCargando(false);
  }, [supabase]);

  useEffect(() => { cargar(); }, [cargar]);

  const items = useMemo(() => {
    return salidas.map((s) => {
      const devuelto = (s.devoluciones_herramientas ?? []).reduce((a, d) => a + d.cantidad_devuelta, 0);
      return { ...s, devuelto, enCampo: s.cantidad - devuelto };
    });
  }, [salidas]);

  const enCampo = items.filter((i) => i.enCampo > 0);
  const devueltos = items.filter((i) => i.enCampo <= 0);

  return (
    <div className="max-w-3xl">
      <PageTitle title={'Hola, ' + perfil.nombre} subtitle="Estas son las herramientas que tienes asignadas" />

      {cargando && <p className="text-sm text-slate-400">Cargando...</p>}

      {!cargando && enCampo.length === 0 && (
        <div className="card text-center py-14 text-slate-400">
          <Package className="mx-auto mb-3" size={36} />
          No tienes herramientas asignadas en este momento.
        </div>
      )}

      {enCampo.length > 0 && (
        <div className="card mb-6">
          <h2 className="font-bold text-fester-blue mb-3">Lo que tienes en campo ({enCampo.reduce((a, i) => a + i.enCampo, 0)} herramientas)</h2>
          <div className="divide-y divide-slate-100">
            {enCampo.map((s) => (
              <div key={s.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-slate-800">{s.herramientas?.nombre ?? '--'}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Folio {String(s.folio).padStart(4, '0')} — {s.obras?.nombre ?? '--'} — Salida: {fmtFecha(s.fecha)}
                  </div>
                  {s.zonas?.nombre && <div className="text-xs text-slate-400">{s.zonas.nombre}</div>}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-extrabold text-fester-blue">{s.enCampo}</div>
                  <div className="text-xs text-slate-400">en campo</div>
                  {s.devuelto > 0 && <div className="text-xs text-green-600">{s.devuelto} devuelta(s)</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {devueltos.length > 0 && (
        <div className="card">
          <h2 className="font-bold text-slate-400 mb-3 text-sm">Herramientas ya devueltas</h2>
          <div className="divide-y divide-slate-100">
            {devueltos.map((s) => (
              <div key={s.id} className="py-2 flex items-center justify-between gap-4 opacity-50">
                <div>
                  <div className="font-medium text-slate-600 line-through">{s.herramientas?.nombre ?? '--'}</div>
                  <div className="text-xs text-slate-400">Folio {String(s.folio).padStart(4, '0')} — {fmtFecha(s.fecha)}</div>
                </div>
                <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-semibold">Devuelta</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
