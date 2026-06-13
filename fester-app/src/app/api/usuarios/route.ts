import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

async function verificarAdmin() {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
  return perfil?.rol === 'admin' ? user : null;
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en .env.local');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// Crear usuario (admin o aplicador)
export async function POST(req: NextRequest) {
  if (!(await verificarAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { usuario, password, nombre, rol, aplicador_id } = await req.json();
  if (!usuario || !password || !nombre || !rol)
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
  if (password.length < 6)
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
  if (rol === 'aplicador' && !aplicador_id)
    return NextResponse.json({ error: 'Debes vincular un aplicador del catálogo' }, { status: 400 });

  try {
    const admin = adminClient();
    const email = `${String(usuario).trim().toLowerCase()}@centrofester.app`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, rol },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Vincular perfil con aplicador y asegurar rol
    const { error: e2 } = await admin
      .from('perfiles')
      .update({ rol, nombre, aplicador_id: rol === 'aplicador' ? aplicador_id : null })
      .eq('id', data.user.id);
    if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });

    // Reflejar el vínculo en el catálogo de aplicadores
    if (rol === 'aplicador' && aplicador_id) {
      await admin.from('aplicadores').update({ user_id: data.user.id }).eq('id', aplicador_id);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Restablecer contraseña
export async function PATCH(req: NextRequest) {
  if (!(await verificarAdmin()))
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const { user_id, password } = await req.json();
  if (!user_id || !password || password.length < 6)
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  try {
    const admin = adminClient();
    const { error } = await admin.auth.admin.updateUserById(user_id, { password });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
