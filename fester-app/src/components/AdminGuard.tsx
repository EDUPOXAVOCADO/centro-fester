'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePerfil } from '@/components/PerfilContext';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const perfil = usePerfil();
  const router = useRouter();
  useEffect(() => {
    if (perfil.rol !== 'admin') router.replace('/registros/nuevo');
  }, [perfil.rol, router]);
  if (perfil.rol !== 'admin') return null;
  return <>{children}</>;
}
