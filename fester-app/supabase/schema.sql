-- ============================================================
-- CENTRO FESTER URUAPAN
-- Sistema de Gestión y Productividad de Aplicadores
-- Esquema completo de base de datos (PostgreSQL / Supabase)
-- Ejecutar COMPLETO en: Supabase Dashboard -> SQL Editor -> New query
-- ============================================================

-- ---------- 1. TABLAS ----------

create table if not exists zonas (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists categorias (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  orden int not null default 0
);

create table if not exists materiales (
  id bigint generated always as identity primary key,
  categoria_id bigint not null references categorias(id) on delete restrict,
  nombre text not null,
  activo boolean not null default true,
  unique (categoria_id, nombre)
);

-- Variantes: garantías (años) o espesores (mm) según el material
create table if not exists garantias (
  id bigint generated always as identity primary key,
  material_id bigint not null references materiales(id) on delete cascade,
  etiqueta text not null,           -- ej. '8 años', '4.5 mm'
  orden int not null default 0,
  unique (material_id, etiqueta)
);

create table if not exists aplicadores (
  id bigint generated always as identity primary key,
  nombre_completo text not null,
  zona_id bigint references zonas(id) on delete set null,
  telefono text,
  fecha_ingreso date,
  activo boolean not null default true,
  foto_url text,
  user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Perfil 1:1 con auth.users (rol del sistema)
create table if not exists perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null default '',
  usuario text unique,              -- nombre de usuario corto para login
  rol text not null default 'aplicador' check (rol in ('admin','aplicador')),
  aplicador_id bigint references aplicadores(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists clientes (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists obras (
  id bigint generated always as identity primary key,
  nombre text not null,
  cliente_id bigint references clientes(id) on delete set null,
  zona_id bigint references zonas(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (nombre, cliente_id)
);

create table if not exists registros (
  id bigint generated always as identity primary key,
  fecha date not null default current_date,
  aplicador_id bigint not null references aplicadores(id) on delete restrict,
  zona_id bigint not null references zonas(id) on delete restrict,
  cliente_id bigint not null references clientes(id) on delete restrict,
  obra_id bigint not null references obras(id) on delete restrict,
  categoria_id bigint not null references categorias(id) on delete restrict,
  material_id bigint not null references materiales(id) on delete restrict,
  garantia_id bigint references garantias(id) on delete set null,
  m2 numeric(12,2) not null check (m2 > 0),
  horas numeric(8,2) not null check (horas > 0),
  observaciones text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_registros_fecha on registros(fecha);
create index if not exists idx_registros_aplicador on registros(aplicador_id);
create index if not exists idx_registros_material on registros(material_id, garantia_id);
create index if not exists idx_registros_zona on registros(zona_id);

create table if not exists fotografias (
  id bigint generated always as identity primary key,
  registro_id bigint not null references registros(id) on delete cascade,
  tipo text not null check (tipo in ('antes','durante','despues')),
  path text not null,               -- ruta dentro del bucket 'evidencias'
  created_at timestamptz not null default now(),
  unique (registro_id, tipo)
);

create table if not exists bonos (
  id bigint generated always as identity primary key,
  semana_inicio date not null,
  semana_fin date not null,
  lugar int not null check (lugar in (1,2,3)),
  aplicador_id bigint not null references aplicadores(id) on delete cascade,
  m2 numeric(12,2) not null,
  material_principal text,
  generado_at timestamptz not null default now(),
  unique (semana_inicio, lugar)
);

create table if not exists configuracion (
  clave text primary key,
  valor text not null
);

-- ---------- 2. FUNCIONES Y TRIGGERS ----------

-- ¿El usuario actual es admin?
create or replace function public.es_admin()
returns boolean
language sql security definer set search_path = public
stable as $$
  select exists (select 1 from perfiles where id = auth.uid() and rol = 'admin');
$$;

-- aplicador_id del usuario actual
create or replace function public.mi_aplicador_id()
returns bigint
language sql security definer set search_path = public
stable as $$
  select aplicador_id from perfiles where id = auth.uid();
$$;

-- Crear perfil automáticamente al registrar usuario en Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre, usuario, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email,'@',1)),
    split_part(new.email,'@',1),
    coalesce(new.raw_user_meta_data->>'rol', 'aplicador')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_registros_touch on registros;
create trigger trg_registros_touch before update on registros
  for each row execute function public.touch_updated_at();

-- ---------- 3. SEGURIDAD (RLS) ----------

alter table zonas enable row level security;
alter table categorias enable row level security;
alter table materiales enable row level security;
alter table garantias enable row level security;
alter table aplicadores enable row level security;
alter table perfiles enable row level security;
alter table clientes enable row level security;
alter table obras enable row level security;
alter table registros enable row level security;
alter table fotografias enable row level security;
alter table bonos enable row level security;
alter table configuracion enable row level security;

-- Catálogos: lectura para todo usuario autenticado, escritura solo admin
do $$
declare t text;
begin
  foreach t in array array['zonas','categorias','materiales','garantias','clientes','obras'] loop
    execute format('drop policy if exists "%s_select" on %s', t, t);
    execute format('create policy "%s_select" on %s for select to authenticated using (true)', t, t);
    execute format('drop policy if exists "%s_admin_all" on %s', t, t);
    execute format('create policy "%s_admin_all" on %s for all to authenticated using (es_admin()) with check (es_admin())', t, t);
  end loop;
end $$;

-- Clientes y obras: el aplicador puede crearlos al capturar
drop policy if exists "clientes_insert_aplicador" on clientes;
create policy "clientes_insert_aplicador" on clientes for insert to authenticated with check (true);
drop policy if exists "obras_insert_aplicador" on obras;
create policy "obras_insert_aplicador" on obras for insert to authenticated with check (true);

-- Aplicadores: todos leen (necesario para selects); solo admin escribe
drop policy if exists "aplicadores_select" on aplicadores;
create policy "aplicadores_select" on aplicadores for select to authenticated using (true);
drop policy if exists "aplicadores_admin" on aplicadores;
create policy "aplicadores_admin" on aplicadores for all to authenticated using (es_admin()) with check (es_admin());

-- Perfiles: cada quien ve el suyo; admin ve y administra todos
drop policy if exists "perfiles_self" on perfiles;
create policy "perfiles_self" on perfiles for select to authenticated using (id = auth.uid() or es_admin());
drop policy if exists "perfiles_admin_write" on perfiles;
create policy "perfiles_admin_write" on perfiles for update to authenticated using (es_admin()) with check (es_admin());

-- Registros: aplicador solo los suyos; admin todo
drop policy if exists "registros_select" on registros;
create policy "registros_select" on registros for select to authenticated
  using (es_admin() or aplicador_id = mi_aplicador_id());
drop policy if exists "registros_insert" on registros;
create policy "registros_insert" on registros for insert to authenticated
  with check (es_admin() or (aplicador_id = mi_aplicador_id() and created_by = auth.uid()));
drop policy if exists "registros_update_admin" on registros;
create policy "registros_update_admin" on registros for update to authenticated
  using (es_admin()) with check (es_admin());
drop policy if exists "registros_delete_admin" on registros;
create policy "registros_delete_admin" on registros for delete to authenticated
  using (es_admin());

-- El aplicador puede eliminar únicamente un registro propio SIN fotografías
-- (limpieza automática cuando falla la subida de evidencias; no puede borrar registros completos)
drop policy if exists "registros_delete_propio_sin_fotos" on registros;
create policy "registros_delete_propio_sin_fotos" on registros for delete to authenticated
  using (
    aplicador_id = mi_aplicador_id()
    and created_by = auth.uid()
    and not exists (select 1 from fotografias f where f.registro_id = registros.id)
  );

-- Fotografías: ligadas al registro
drop policy if exists "fotos_select" on fotografias;
create policy "fotos_select" on fotografias for select to authenticated
  using (es_admin() or exists (select 1 from registros r where r.id = registro_id and r.aplicador_id = mi_aplicador_id()));
drop policy if exists "fotos_insert" on fotografias;
create policy "fotos_insert" on fotografias for insert to authenticated
  with check (es_admin() or exists (select 1 from registros r where r.id = registro_id and r.aplicador_id = mi_aplicador_id()));
drop policy if exists "fotos_delete_admin" on fotografias;
create policy "fotos_delete_admin" on fotografias for delete to authenticated using (es_admin());

-- Bonos y configuración: solo admin
drop policy if exists "bonos_admin" on bonos;
create policy "bonos_admin" on bonos for all to authenticated using (es_admin()) with check (es_admin());
drop policy if exists "config_admin" on configuracion;
create policy "config_admin" on configuracion for all to authenticated using (es_admin()) with check (es_admin());

-- ---------- 4. STORAGE (evidencias fotográficas) ----------

insert into storage.buckets (id, name, public)
values ('evidencias','evidencias', true)
on conflict (id) do nothing;

drop policy if exists "evidencias_read" on storage.objects;
create policy "evidencias_read" on storage.objects for select to authenticated
  using (bucket_id = 'evidencias');
drop policy if exists "evidencias_upload" on storage.objects;
create policy "evidencias_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'evidencias');
drop policy if exists "evidencias_delete_admin" on storage.objects;
create policy "evidencias_delete_admin" on storage.objects for delete to authenticated
  using (bucket_id = 'evidencias' and es_admin());

-- ---------- 5. DATOS INICIALES (catálogos) ----------

insert into zonas (nombre) values
  ('Uruapan'),('Morelia'),('La Piedad'),('Lázaro Cárdenas'),('Zihuatanejo'),('Querétaro / Alrededores')
on conflict (nombre) do nothing;

insert into categorias (nombre, orden) values
  ('Impermeabilizantes Acrílicos',1),
  ('Prefabricados',2),
  ('Asfálticos',3),
  ('Cementosos',4),
  ('Poliuretanos',5)
on conflict (nombre) do nothing;

-- Materiales
with cat as (select id, nombre from categorias)
insert into materiales (categoria_id, nombre)
select c.id, m.nombre from (values
  ('Impermeabilizantes Acrílicos','Acriton'),
  ('Impermeabilizantes Acrílicos','Acriton Proshield'),
  ('Impermeabilizantes Acrílicos','CL-52'),
  ('Impermeabilizantes Acrílicos','Acriton Híbrido'),
  ('Impermeabilizantes Acrílicos','Acriton Fachadas Liso'),
  ('Impermeabilizantes Acrílicos','Acriton Fachadas Rugoso'),
  ('Impermeabilizantes Acrílicos','Acriton Sellador'),
  ('Impermeabilizantes Acrílicos','Acriflex Malla'),
  ('Impermeabilizantes Acrílicos','Revoflex Malla'),
  ('Prefabricados','Prefabricado APP'),
  ('Prefabricados','Prefabricado SBS'),
  ('Prefabricados','Hidroprimer'),
  ('Prefabricados','Plastic Cement (Prefabricados)'),
  ('Prefabricados','Festalum'),
  ('Prefabricados','Festerblanc'),
  ('Asfálticos','Vaportite 550'),
  ('Asfálticos','Plastic Cement'),
  ('Asfálticos','Microfest'),
  ('Asfálticos','Microlastic'),
  ('Asfálticos','Microseal 2F'),
  ('Cementosos','CR-65'),
  ('Cementosos','CR-66'),
  ('Cementosos','Festergral'),
  ('Cementosos','CR Nanotech Admix'),
  ('Poliuretanos','Sistema Poliuretano')
) as m(categoria,nombre)
join cat c on c.nombre = m.categoria
on conflict (categoria_id, nombre) do nothing;

-- Garantías Acriton
insert into garantias (material_id, etiqueta, orden)
select m.id, g.et, g.o from materiales m
cross join (values ('3 años',3),('4 años',4),('5 años',5),('6 años',6),('7 años',7),('8 años',8),('10 años',10),('12 años',12)) g(et,o)
where m.nombre = 'Acriton'
on conflict do nothing;

-- Garantías Acriton Proshield
insert into garantias (material_id, etiqueta, orden)
select m.id, g.et, g.o from materiales m
cross join (values ('4 años',4),('6 años',6),('8 años',8)) g(et,o)
where m.nombre = 'Acriton Proshield'
on conflict do nothing;

-- Espesores prefabricados APP y SBS
insert into garantias (material_id, etiqueta, orden)
select m.id, g.et, g.o from materiales m
cross join (values ('3.5 mm',1),('4.5 mm',2)) g(et,o)
where m.nombre in ('Prefabricado APP','Prefabricado SBS')
on conflict do nothing;

insert into configuracion (clave, valor) values
  ('nombre_empresa','Centro Fester Uruapan'),
  ('bono_dia_corte','domingo')
on conflict (clave) do nothing;

-- ============================================================
-- 6. DESPUÉS DE EJECUTAR ESTE SCRIPT:
--    a) Crea tu usuario administrador en Authentication -> Users
--       -> Add user, ej. email: admin@centrofester.app  (con contraseña)
--    b) Ejecuta:  update perfiles set rol='admin' where usuario='admin';
--    Los usuarios aplicadores se crean desde el panel de la aplicación.
-- ============================================================
