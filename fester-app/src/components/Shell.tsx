'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase-browser';
import Logo from '@/components/Logo';
import { PerfilProvider, usePerfil } from '@/components/PerfilContext';
import type { Perfil } from '@/types/db';
import {
  LayoutDashboard, TrendingUp, Package, Map, Trophy, Brain, ClipboardList,
  PlusCircle, Users, FolderCog, FileBarChart2, LogOut, Menu, X, History, UserCog, Building2, ClipboardCheck,
} from 'lucide-react';

const adminNav = [
  { href: '/dashboard', label: 'Dashboard Ejecutivo', icon: LayoutDashboard },
  { href: '/dashboard/productividad', label: 'Productividad', icon: TrendingUp },
  { href: '/dashboard/materiales', label: 'Por Material', icon: Package },
  { href: '/dashboard/zonas', label: 'Por Zona', icon: Map },
  { href: '/dashboard/bonos', label: 'Bonos Semanales', icon: Trophy },
  { href: '/inteligencia', label: 'Inteligencia Operativa', icon: Brain },
  { href: '/registros', label: 'Registros', icon: ClipboardList },
  { href: '/registros/nuevo', label: 'Nueva Actividad', icon: PlusCircle },
  { href: '/catalogos/aplicadores', label: 'Aplicadores', icon: Users },
  { href: '/catalogos/obras', label: 'Obras', icon: Building2 },
  { href: '/catalogos/materiales', label: 'Materiales y Zonas', icon: FolderCog },
  { href: '/usuarios', label: 'Usuarios', icon: UserCog },
  { href: '/reportes', label: 'Reportes', icon: FileBarChart2 },
];

const aplicadorNav = [
  { href: '/registros/nuevo', label: 'Registrar Actividad', icon: PlusCircle },
  { href: '/mis-registros', label: 'Mi Historial', icon: History },
];

const encargadoNav = [
  { href: '/encargado', label: 'Registrar Actividad', icon: ClipboardCheck },
  { href: '/mis-registros', label: 'Mis Registros de Hoy', icon: History },
];

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const perfil = usePerfil();
  const pathname = usePathname();
  const items = perfil.rol === 'admin' ? adminNav : perfil.rol === 'encargado' ? encargadoNav : aplicadorNav;
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href} onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              active ? 'bg-white/15 text-white' : 'text-blue-100 hover:bg-white/10 hover:text-white'
            }`}>
            <Icon size={18} /> {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const perfil = usePerfil();
  const router = useRouter();
  async function logout() {
    await getSupabase().auth.signOut();
    router.replace('/login');
    router.refresh();
  }
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} />}
      <aside className={`fixed z-40 inset-y-0 left-0 w-72 bg-fester-blue flex flex-col transition-transform lg:translate-x-0 lg:static ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <Logo size={36} light />
          <button className="lg:hidden text-white" onClick={onClose}><X size={22} /></button>
        </div>
        <Nav onNavigate={onClose} />
        <div className="border-t border-white/10 p-4">
          <div className="text-white text-sm font-semibold truncate">{perfil.nombre}</div>
          <div className="text-blue-200 text-xs capitalize mb-3">{perfil.rol}</div>
          <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg bg-fester-red px-3 py-2 text-sm font-semibold text-white hover:bg-fester-red-dark transition">
            <LogOut size={16} /> Cerrar sesion
          </button>
        </div>
      </aside>
    </>
  );
}

export default function Shell({ perfil, children }: { perfil: Perfil; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <PerfilProvider perfil={perfil}>
      <div className="flex min-h-screen">
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-20 flex items-center gap-3 bg-white border-b border-slate-200 px-4 py-3 lg:px-8">
            <button className="lg:hidden text-fester-blue" onClick={() => setOpen(true)}><Menu size={24} /></button>
            <div className="text-sm font-semibold text-slate-600 truncate">
              Sistema de Gestion y Productividad de Aplicadores
            </div>
          </header>
          <main className="flex-1 p-4 lg:p-8 max-w-[1500px] w-full mx-auto">{children}</main>
        </div>
      </div>
    </PerfilProvider>
  );
}