export type Rol = 'admin' | 'aplicador' | 'encargado';

export interface Perfil {
  id: string;
  nombre: string;
  usuario: string | null;
  rol: Rol;
  aplicador_id: number | null;
}

export interface Zona { id: number; nombre: string; activo: boolean; }
export interface Categoria { id: number; nombre: string; orden: number; }
export interface Material { id: number; categoria_id: number; nombre: string; activo: boolean; }
export interface Garantia { id: number; material_id: number; etiqueta: string; orden: number; }
export interface Cliente { id: number; nombre: string; }
export interface Obra { id: number; nombre: string; cliente_id: number | null; zona_id: number | null; activo?: boolean; }

export interface Aplicador {
  id: number;
  nombre_completo: string;
  zona_id: number | null;
  telefono: string | null;
  fecha_ingreso: string | null;
  activo: boolean;
  foto_url: string | null;
  user_id: string | null;
  zonas?: { nombre: string } | null;
}

export interface Registro {
  id: number;
  fecha: string;
  aplicador_id: number;
  zona_id: number;
  cliente_id: number;
  obra_id: number;
  categoria_id: number;
  material_id: number;
  garantia_id: number | null;
  m2: number;
  horas: number;
  observaciones: string | null;
  created_by: string;
  created_at: string;
  aplicadores?: { nombre_completo: string } | null;
  zonas?: { nombre: string } | null;
  clientes?: { nombre: string } | null;
  obras?: { nombre: string } | null;
  categorias?: { nombre: string } | null;
  materiales?: { nombre: string } | null;
  garantias?: { etiqueta: string } | null;
  fotografias?: Fotografia[];
}

export interface Fotografia {
  id: number;
  registro_id: number;
  tipo: 'antes' | 'durante' | 'despues';
  path: string;
}

export interface Bono {
  id: number;
  semana_inicio: string;
  semana_fin: string;
  lugar: 1 | 2 | 3;
  aplicador_id: number;
  m2: number;
  material_principal: string | null;
  aplicadores?: Aplicador | null;
}
