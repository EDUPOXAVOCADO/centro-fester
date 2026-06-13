'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase-browser';
import { usePerfil } from '@/components/PerfilContext';
import PageTitle from '@/components/PageTitle';
import type { Aplicador, Categoria, Garantia, Material } from '@/types/db';
import { Camera, CheckCircle2, ClipboardList, Save } from 'lucide-react';
import { fmtNum } from '@/lib/format';

type FotoTipo = 'antes' | 'durante' | 'despues';
const FOTOS: { tipo: FotoTipo; label: string }[] = [
  { tipo: 'antes', label: 'Foto ANTES' },
  { tipo: 'durante', label: 'Foto DURANTE' },
  { tipo: 'despues', label: 'Foto DESPUÉS' },
];

const hoy = new Date().toISOString().slice(0, 10);

export default function EncargadoPage() {
  const supabase = getSupabase();
  const perfil = usePerfil();

  const [aplicadores, setAplicadores] = useState<Aplicador[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [obras, setObras] = useState<any[]>([]);
  const [registrosHoy, setRegistrosHoy] = useState<any[]>([]);

  const [f, setF] = useState({
    fecha: hoy,
    aplicador_id: '',
    obra_id: '',
    categoria_id: '',
    material_id: '',
    garantia_id: '',
    m2: '',
    horas: '',
    observaciones: '',
  });
  const [fotos, setFotos] = useState<Record<FotoTipo, File | null>>({ antes: null, durante: null, despues: null });
  const [previews, setPreviews] = useState<Record<FotoTipo, string>>({ antes: '', durante: '', despues: '' });
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const [apls, cats, mats, gars, obs, regsHoy] = await Promise.all([
      supabase.from('aplicadores').select('*, zonas(nombre)').eq('activo', true).order('nombre_completo'),
      supabase.from('categorias').select('*').order('orden'),
      supabase.from('materiales').select('*').eq('activo', true).order('nombre'),
      supabase.from('garantias').select('*').order('orden'),
      supabase.from('obras').select('*, clientes(nombre), zonas(nombre)').neq('activo', false).order('nombre'),
      supabase.from('registros')
        .select('*, aplicadores(nombre_completo), obras(nombre), materiales(nombre), garantias(etiqueta)')
        .eq('fecha', hoy)
        .eq('created_by', user!.id)
        .order('created_at', { ascending: false }),
    ]);
    setAplicadores((apls.data as Aplicador[]) ?? []);
    setCategorias((cats.data as Categoria[]) ?? []);
    setMateriales((mats.data as Material[]) ?? []);
    setGarantias((gars.data as Garantia[]) ?? []);
    setObras((obs.data as any[]) ?? []);
    setRegistrosHoy((regsHoy.data as any[]) ?? []);
  }, [supabase]);

  useEffect(() => { cargar(); }, [cargar]);

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

    if (!f.aplicador_id) return setError('Selecciona el aplicador.');
    if (!f.obra_id) return setError('Selecciona la obra.');
    if (!f.categoria_id || !f.material_id) return setError('Selecciona categoría y material.');
    if (garantiasFiltradas.length > 0 && !f.garantia_id) return setError('Selecciona la garantía / espesor.');
    const m2 = Number(f.m2), horas = Number(f.horas);
    if (!m2 || m2 <= 0) return setError('Los m² deben ser mayores a 0.');
    if (!horas || horas <= 0) return setError('Las horas deben ser mayores a 0.');
    if (!fotos.antes || !fotos.durante || !fotos.despues)
      return setError('Las 3 fotografías son obligatorias.');

    const obraSeleccionada = obras.find((o) => String(o.id) === f.obra_id);

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: reg, error: eReg } = await supabase.from('registros').insert({
        fecha: f.fecha,
        aplicador_id: Number(f.aplicador_id),
        zona_id: obraSeleccionada?.zona_id ?? null,
        cliente_id: obraSeleccionada?.cliente_id ?? null,
        obra_id: Number(f.obra_id),
        categoria_id: Number(f.categoria_id),
        material_id: Number(f.material_id),
        garantia_id: f.garantia_id ? Number(f.garantia_id) : null,
        m2, horas,
        observaciones: f.observaciones.trim() || null,
        created_by: user!.id,
      }).select('id').single();
      if (eReg) throw eReg;

      try {
        for (const { tipo } of FOTOS) {
          const file = fotos[tipo]!;
          const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
          const path = `registro-${reg.id}/${tipo}-${Date.now()}.${ext}`;
          const { error: eUp } = await supabase.storage.from('evidencias')
            .upload(path, file, { cacheControl: '3600', upsert: false });
          if (eUp) throw eUp;
          await supabase.from('fotografias').insert({ registro_id: reg.id, tipo, path });
        }
      } catch (err) {
        await supabase.from('registros').delete().eq('id', reg.id);
        throw new Error('Error al subir fotos. Registro no guardado. Intenta de nuevo.');
      }

      const aplNombre = aplicadores.find((a) => String(a.id) === f.aplicador_id)?.nombre_completo ?? '';
      setOkMsg(`✓ Registro guardado para ${aplNombre} — ${fmtNum(m2)} m²`);
      setF({ ...f, aplicador_id: '', obra_id: '', m2: '', horas: '', observaciones: '', garantia_id: '' });
      setFotos({ antes: null, durante: null, despues: null });
      setPreviews({ antes: '', durante: '', despues: '' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      cargar();
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageTitle
        title={`Bienvenido, ${perfil.nombre}`}
        subtitle="Registra la actividad de cada uno de tus aplicadores"
      />

      {okMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm font-medium text-green-700">
          <CheckCircle2 size={18} /> {okMsg}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-fester-red">{error}</div>
      )}

      <form onSubmit={guardar} className="space-y-5">
        <div className="card grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Fecha *</label>
            <input className="input" type="date" required max={hoy} value={f.fecha}
              onChange={(e) => setF({ ...f, fecha: e.target.value })} />
          </div>
          <div>
            <label className="label text-fester-blue font-bold">Aplicador *</label>
            <select className="input border-fester-blue" required value={f.aplicador_id}
              onChange={(e) => setF({ ...f, aplicador_id: e.target.value })}>
              <option value="">— Seleccionar aplicador —</option>
              {aplicadores.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre_completo}{a.zonas?.nombre ? ` (${a.zonas.nombre})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Obra *</label>
            <select className="input" required value={f.obra_id}
              onChange={(e) => setF({ ...f, obra_id: e.target.value })}>
              <option value="">— Seleccionar obra —</option>
              {obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}{o.clientes?.nombre ? ` — ${o.clientes.nombre}` : ''}{o.zonas?.nombre ? ` (${o.zonas.nombre})` : ''}
                </option>
              ))}
            </select>
            {obras.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">No hay obras activas. Pide al administrador que las registre.</p>
            )}
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
