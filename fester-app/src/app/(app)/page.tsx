import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase-server';

export default async function Home() {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
  redirect(perfil?.rol === 'admin' ? '/dashboard' : '/registros/nuevo');
}
