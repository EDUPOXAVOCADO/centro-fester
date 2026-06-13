import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase-server';
import Shell from '@/components/Shell';
import type { Perfil } from '@/types/db';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('id, nombre, usuario, rol, aplicador_id, zona_id')
    .eq('id', user.id)
    .single();

  if (!perfil) redirect('/login');

  return <Shell perfil={perfil as Perfil}>{children}</Shell>;
}
