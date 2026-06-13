'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePerfil } from '@/components/PerfilContext';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const perfil = usePerfil();
  const router = useRouter();
  useEffect(() => {
    if (perfil.rol === 'encargado') router.replace('/encargado');
    else if (perfil.rol === 'aplicador') router.replace('/registros/nuevo');
  }, [perfil.rol, router]);
  if (perfil.rol !== 'admin' && perfil.rol !== 'gerente') return null;
  return <>{children}</>;
}
