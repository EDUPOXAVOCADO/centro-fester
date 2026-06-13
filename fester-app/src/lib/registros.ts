import { getSupabase } from '@/lib/supabase-browser';
import type { Registro } from '@/types/db';

export const REGISTRO_SELECT = `
  *,
  aplicadores(nombre_completo),
  zonas(nombre),
  clientes(nombre),
  obras(nombre),
  categorias(nombre),
  materiales(nombre),
  garantias(etiqueta),
  fotografias(id, registro_id, tipo, path)
`;

export interface FiltrosRegistros {
  desde?: string;
  hasta?: string;
  aplicador_id?: number;
  zona_id?: number;
  categoria_id?: number;
  material_id?: number;
  garantia_id?: number;
}

export async function fetchRegistros(filtros: FiltrosRegistros = {}, limit = 2000): Promise<Registro[]> {
  const supabase = getSupabase();
  let q = supabase.from('registros').select(REGISTRO_SELECT).order('fecha', { ascending: false }).order('id', { ascending: false }).limit(limit);
  if (filtros.desde) q = q.gte('fecha', filtros.desde);
  if (filtros.hasta) q = q.lte('fecha', filtros.hasta);
  if (filtros.aplicador_id) q = q.eq('aplicador_id', filtros.aplicador_id);
  if (filtros.zona_id) q = q.eq('zona_id', filtros.zona_id);
  if (filtros.categoria_id) q = q.eq('categoria_id', filtros.categoria_id);
  if (filtros.material_id) q = q.eq('material_id', filtros.material_id);
  if (filtros.garantia_id) q = q.eq('garantia_id', filtros.garantia_id);
  const { data, error } = await q;
  if (error) throw error;
  return (data as unknown as Registro[]) ?? [];
}

export function fotoUrl(path: string): string {
  const supabase = getSupabase();
  return supabase.storage.from('evidencias').getPublicUrl(path).data.publicUrl;
}

// Etiqueta única material+garantía (regla: nunca mezclar materiales)
export function claveMaterial(r: Registro): string {
  return `${r.materiales?.nombre ?? ''}${r.garantias?.etiqueta ? ' ' + r.garantias.etiqueta : ''}`;
}
