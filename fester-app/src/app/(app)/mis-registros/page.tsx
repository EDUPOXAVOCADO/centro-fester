'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePerfil } from '@/components/PerfilContext';
import PageTitle from '@/components/PageTitle';
import { fetchRegistros, fotoUrl, claveMaterial } from '@/lib/registros';
import { fmtFecha, fmtM2, fmtNum } from '@/lib/format';
import type { Registro } from '@/types/db';
import { ImageIcon } from 'lucide-react';

export default function MisRegistrosPage() {
  const perfil = usePerfil();
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [verFotos, setVerFotos] = useState<Registro | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    if (!perfil.aplicador_id && perfil.rol !== 'admin') { setCargando(false); return; }
    const data = await fetchRegistros(
      perfil.rol === 'aplicador' ? { aplicador_id: perfil.aplicador_id! } : {}
    );
    setRegistros(data);
    setCargando(false);
  }, [perfil]);

  useEffect(() => { cargar(); }, [cargar]);

  const totalM2 = registros.reduce((s, r) => s + Number(r.m2), 0);
  const totalHoras = registros.reduce((s, r) => s + Number(r.horas), 0);

  return (
    <div>
      <PageTitle title="Mi Historial" subtitle="Tus actividades registradas" />

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card text-center">
          <div className="text-2xl font-extrabold text-fester-blue">{fmtNum(totalM2)}</div>
          <div className="text-xs text-slate-500 font-medium">m² totales</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-extrabold text-fester-blue">{registros.length}</div>
          <div className="text-xs text-slate-500 font-medium">actividades</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-extrabold text-fester-blue">{totalHoras > 0 ? fmtNum(totalM2 / totalHoras) : '0'}</div>
          <div className="text-xs text-slate-500 font-medium">m² / hora</div>
        </div>
      </div>

      {cargando && <p className="text-slate-500 text-sm">Cargando…</p>}
      {!cargando && registros.length === 0 && (
        <div className="card text-center text-slate-400 py-12">Aún no tienes actividades registradas.</div>
      )}

      <div className="space-y-3">
        {registros.map((r) => (
          <div key={r.id} className="card flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="min-w-[110px]">
              <div className="text-xs text-slate-400">{fmtFecha(r.fecha)}</div>
              <div className="font-bold text-fester-blue">{fmtM2(Number(r.m2))}</div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="font-semibold text-sm">{r.obras?.nombre}</div>
              <div className="text-xs text-slate-500">{r.clientes?.nombre} · {r.zonas?.nombre}</div>
            </div>
            <div className="min-w-[160px]">
              <div className="text-sm font-medium">{claveMaterial(r)}</div>
              <div className="text-xs text-slate-500">{r.categorias?.nombre} · {fmtNum(Number(r.horas))} h</div>
            </div>
            <button className="btn-outline !py-1.5 !px-3 text-xs" onClick={() => setVerFotos(r)}>
              <ImageIcon size={14} /> Evidencias ({r.fotografias?.length ?? 0})
            </button>
          </div>
        ))}
      </div>

      {verFotos && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setVerFotos(null)}>
          <div className="bg-white rounded-2xl p-5 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-fester-blue mb-1">{verFotos.obras?.nombre}</h3>
            <p className="text-xs text-slate-500 mb-4">{fmtFecha(verFotos.fecha)} · {claveMaterial(verFotos)}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {(['antes', 'durante', 'despues'] as const).map((tipo) => {
                const foto = verFotos.fotografias?.find((ft) => ft.tipo === tipo);
                return (
                  <div key={tipo}>
                    <div className="text-xs font-bold uppercase text-slate-500 mb-1">{tipo}</div>
                    {foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fotoUrl(foto.path)} alt={tipo} className="rounded-lg w-full h-44 object-cover border border-slate-200" />
                    ) : (
                      <div className="rounded-lg w-full h-44 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">Sin foto</div>
                    )}
                  </div>
                );
              })}
            </div>
            <button className="btn-outline w-full mt-4" onClick={() => setVerFotos(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
