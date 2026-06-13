'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase-browser';
import { usePerfil } from '@/components/PerfilContext';
import PageTitle from '@/components/PageTitle';
import type { Aplicador, Categoria, Cliente, Garantia, Material, Obra, Zona } from '@/types/db';
import { Camera, CheckCircle2, Save } from 'lucide-react';

type FotoTipo = 'antes' | 'durante' | 'despues';
const FOTOS: { tipo: FotoTipo; label: string }[] = [
  { tipo: 'antes', label: 'Foto ANTES' },
  { tipo: 'durante', label: 'Foto DURANTE' },
  { tipo: 'despues', label: 'Foto DESPUÉS' },
];

export default function NuevaActividadPage() {
  const supabase = getSupabase();
  const perfil = usePerfil();
  const router = useRouter();

  const [zonas, setZonas] = useState<Zona[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [aplicadores, setAplicadores] = useState<Aplicador[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);

  const hoy = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    fecha: hoy, aplicador_id: '', zona_id: '', cliente: '', obra: '',
    categoria_id: '', material_id: '', garantia_id: '', m2: '', horas: '', observaciones: '',
  });
  const [fotos, setFotos] = useState<Record<FotoTipo, File | null>>({ antes: null, durante: null, despues: null });
  const [previews, setPreviews] = useState<Record<FotoTipo, string>>({ antes: '', durante: '', despues: '' });
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    const [z, c, m, g, a, cl, ob] = await Promise.all([
      supabase.from('zonas').select('*').eq('activo', true).order('nombre'),
      supabase.from('categorias').select('*').order('orden'),
      supabase.from('materiales').select('*').eq('activo', true).order('nombre'),
      supabase.from('garantias').select('*').order('orden'),
      supabase.from('aplicadores').select('*').eq('activo', true).order('nombre_completo'),
      supabase.from('clientes').select('*').order('nombre'),
      supabase.from('obras').select('*').order('nombre'),
    ]);
    setZonas((z.data as Zona[]) ?? []);
    setCategorias((c.data as Categoria[]) ?? []);
    setMateriales((m.data as Material[]) ?? []);
    setGarantias((g.data as Garantia[]) ?? []);
    setAplicadores((a.data as Aplicador[]) ?? []);
    setClientes((cl.data as Cliente[]) ?? []);
    setObras((ob.data as Obra[]) ?? []);
  }, [supabase]);

  useEffect(() => { cargar(); }, [cargar]);

  // Aplicador: selección automática según usuario logueado
  useEffect(() => {
    if (perfil.rol === 'aplicador' && perfil.aplicador_id) {
      setF((prev) => ({ ...prev, aplicador_id: String(perfil.aplicador_id) }));
      const ap = aplicadores.find((a) => a.id === perfil.aplicador_id);
      if (ap?.zona_id) setF((prev) => ({ ...prev, zona_id: prev.zona_id || String(ap.zona_id) }));
    }
  }, [perfil, aplicadores]);

  const materialesFiltrados = useMemo(
    () => materiales.filter((m) => String(m.categoria_id) === f.categoria_id),
    [materiales, f.categoria_id]
  );
  const garantiasFiltradas = useMemo(
    () => garantias.filter((g) => String(g.material_id) === f.material_id),
    [garantias, f.material_id]
  );

  function setFoto(tipo: FotoTipo, file: File | null) {
    setFotos((prev) => ({ ...prev, [tipo]: file }));
    setPreviews((prev) => ({ ...prev, [tipo]: file ? URL.createObjectURL(file) : '' }));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setOkMsg('');

    // Validación estricta
    if (!f.aplicador_id) return setError('Selecciona el aplicador.');
    if (!f.zona_id) return setError('Selecciona la zona.');
    if (!f.cliente.trim()) return setError('Indica el cliente.');
    if (!f.obra.trim()) return setError('Indica el nombre de la obra.');
    if (!f.categoria_id || !f.material_id) return setError('Selecciona categoría y material.');
    if (garantiasFiltradas.length > 0 && !f.garantia_id) return setError('Selecciona la garantía / espesor del material.');
    const m2 = Number(f.m2), horas = Number(f.horas);
    if (!m2 || m2 <= 0) return setError('Los metros cuadrados deben ser mayores a 0.');
    if (!horas || horas <= 0) return setError('Las horas trabajadas deben ser mayores a 0.');
    if (!fotos.antes || !fotos.durante || !fotos.despues)
      return setError('Las 3 fotografías (antes, durante y después) son OBLIGATORIAS.');

    setSaving(true);
    try {
      // 1. Cliente (buscar o crear)
      let clienteId: number;
      const cliEx = clientes.find((c) => c.nombre.toLowerCase() === f.cliente.trim().toLowerCase());
      if (cliEx) clienteId = cliEx.id;
      else {
        const { data, error } = await supabase.from('clientes').insert({ nombre: f.cliente.trim() }).select('id').single();
        if (error) throw error;
        clienteId = data.id;
      }

      // 2. Obra (buscar o crear)
      let obraId: number;
      const obraEx = obras.find((o) => o.nombre.toLowerCase() === f.obra.trim().toLowerCase() && o.cliente_id === clienteId);
      if (obraEx) obraId = obraEx.id;
      else {
        const { data, error } = await supabase.from('obras')
          .insert({ nombre: f.obra.trim(), cliente_id: clienteId, zona_id: Number(f.zona_id) }).select('id').single();
        if (error) throw error;
        obraId = data.id;
      }

      // 3. Registro
      const { data: { user } } = await supabase.auth.getUser();
      const { data: reg, error: eReg } = await supabase.from('registros').insert({
        fecha: f.fecha,
        aplicador_id: Number(f.aplicador_id),
        zona_id: Number(f.zona_id),
        cliente_id: clienteId,
        obra_id: obraId,
        categoria_id: Number(f.categoria_id),
        material_id: Number(f.material_id),
        garantia_id: f.garantia_id ? Number(f.garantia_id) : null,
        m2, horas,
        observaciones: f.observaciones.trim() || null,
        created_by: user!.id,
      }).select('id').single();
      if (eReg) throw eReg;

      // 4. Fotografías (obligatorias) — si falla alguna, se elimina el registro
      try {
        for (const { tipo } of FOTOS) {
          const file = fotos[tipo]!;
          const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
          const path = `registro-${reg.id}/${tipo}-${Date.now()}.${ext}`;
          const { error: eUp } = await supabase.storage.from('evidencias')
            .upload(path, file, { cacheControl: '3600', upsert: false });
          if (eUp) throw eUp;
          const { error: eFoto } = await supabase.from('fotografias')
            .insert({ registro_id: reg.id, tipo, path });
          if (eFoto) throw eFoto;
        }
      } catch (err) {
        await supabase.from('registros').delete().eq('id', reg.id);
        throw new Error('Error al subir fotografías. El registro NO se guardó. Intenta de nuevo.');
      }

      setOkMsg('Actividad registrada correctamente con sus 3 evidencias.');
      setF({ ...f, cliente: '', obra: '', m2: '', horas: '', observaciones: '', garantia_id: '' });
      setFotos({ antes: null, durante: null, despues: null });
      setPreviews({ antes: '', durante: '', despues: '' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => router.refresh(), 600);
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageTitle title="Registrar Actividad" subtitle="Una actividad por obra realizada — evidencias obligatorias" />

      {okMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm font-medium text-green-700">
          <CheckCircle2 size={18} /> {okMsg}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-fester-red">{error}</div>
      )}

      <form onSubmit={guardar} className="space-y-6">
        <div className="card grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Fecha *</label>
            <input className="input" type="date" required max={hoy} value={f.fecha}
              onChange={(e) => setF({ ...f, fecha: e.target.value })} />
          </div>
          <div>
            <label className="label">Aplicador *</label>
            {perfil.rol === 'aplicador' ? (
              <input className="input bg-slate-100" disabled
                value={aplicadores.find((a) => String(a.id) === f.aplicador_id)?.nombre_completo ?? 'Tu usuario'} />
            ) : (
              <select className="input" required value={f.aplicador_id}
                onChange={(e) => setF({ ...f, aplicador_id: e.target.value })}>
                <option value="">— Seleccionar —</option>
                {aplicadores.map((a) => <option key={a.id} value={a.id}>{a.nombre_completo}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="label">Zona *</label>
            <select className="input" required value={f.zona_id} onChange={(e) => setF({ ...f, zona_id: e.target.value })}>
              <option value="">— Seleccionar —</option>
              {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Cliente *</label>
            <input className="input" required list="clientes-list" value={f.cliente}
              onChange={(e) => setF({ ...f, cliente: e.target.value })} placeholder="Nombre del cliente" />
            <datalist id="clientes-list">
              {clientes.map((c) => <option key={c.id} value={c.nombre} />)}
            </datalist>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Nombre de la obra *</label>
            <input className="input" required list="obras-list" value={f.obra}
              onChange={(e) => setF({ ...f, obra: e.target.value })} placeholder="ej. Bodega Nave 3 — Parque Industrial" />
            <datalist id="obras-list">
              {obras.map((o) => <option key={o.id} value={o.nombre} />)}
            </datalist>
          </div>
        </div>

        <div className="card grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Categoría *</label>
            <select className="input" required value={f.categoria_id}
              onChange={(e) => setF({ ...f, categoria_id: e.target.value, material_id: '', garantia_id: '' })}>
              <option value="">— Seleccionar —</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Material *</label>
            <select className="input" required value={f.material_id} disabled={!f.categoria_id}
              onChange={(e) => setF({ ...f, material_id: e.target.value, garantia_id: '' })}>
              <option value="">— Seleccionar —</option>
              {materialesFiltrados.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Garantía / Espesor {garantiasFiltradas.length > 0 && '*'}</label>
            <select className="input" value={f.garantia_id} disabled={garantiasFiltradas.length === 0}
              required={garantiasFiltradas.length > 0}
              onChange={(e) => setF({ ...f, garantia_id: e.target.value })}>
              <option value="">{garantiasFiltradas.length ? '— Seleccionar —' : 'No aplica'}</option>
              {garantiasFiltradas.map((g) => <option key={g.id} value={g.id}>{g.etiqueta}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Metros cuadrados (m²) *</label>
            <input className="input" type="number" step="0.01" min="0.01" required value={f.m2}
              onChange={(e) => setF({ ...f, m2: e.target.value })} placeholder="ej. 120" />
          </div>
          <div>
            <label className="label">Horas trabajadas *</label>
            <input className="input" type="number" step="0.5" min="0.5" required value={f.horas}
              onChange={(e) => setF({ ...f, horas: e.target.value })} placeholder="ej. 8" />
          </div>
          <div className="sm:col-span-3">
            <label className="label">Observaciones</label>
            <textarea className="input" rows={3} value={f.observaciones}
              onChange={(e) => setF({ ...f, observaciones: e.target.value })}
              placeholder="Condiciones de la superficie, clima, detalles relevantes…" />
          </div>
        </div>

        <div className="card">
          <h2 className="font-bold text-fester-blue mb-1 flex items-center gap-2"><Camera size={18} /> Evidencias fotográficas *</h2>
          <p className="text-xs text-slate-500 mb-4">Las tres fotografías son obligatorias. No se puede guardar el registro sin ellas.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {FOTOS.map(({ tipo, label }) => (
              <div key={tipo}>
                <label className="label">{label} *</label>
                <label className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3 py-6 cursor-pointer transition ${
                  fotos[tipo] ? 'border-green-400 bg-green-50' : 'border-slate-300 hover:border-fester-blue bg-slate-50'
                }`}>
                  {previews[tipo] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previews[tipo]} alt={label} className="h-28 w-full object-cover rounded-lg" />
                  ) : (
                    <>
                      <Camera className="text-slate-400" size={28} />
                      <span className="text-xs text-slate-500 text-center">Tocar para tomar o elegir foto</span>
                    </>
                  )}
                  <input type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={(e) => setFoto(tipo, e.target.files?.[0] ?? null)} />
                </label>
                {fotos[tipo] && (
                  <p className="mt-1 text-xs text-green-600 font-medium truncate">✓ {fotos[tipo]!.name}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <button className="btn-primary w-full py-3.5 text-base" disabled={saving}>
          <Save size={18} /> {saving ? 'Guardando registro y subiendo fotos…' : 'Guardar actividad'}
        </button>
      </form>
    </div>
  );
}
