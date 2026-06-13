'use client';

import { createContext, useContext } from 'react';
import type { Perfil } from '@/types/db';

const Ctx = createContext<Perfil | null>(null);

export function PerfilProvider({ perfil, children }: { perfil: Perfil; children: React.ReactNode }) {
  return <Ctx.Provider value={perfil}>{children}</Ctx.Provider>;
}

export function usePerfil(): Perfil {
  const p = useContext(Ctx);
  if (!p) throw new Error('usePerfil debe usarse dentro de PerfilProvider');
  return p;
}
