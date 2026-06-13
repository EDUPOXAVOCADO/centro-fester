# CENTRO FESTER URUAPAN
## Sistema de Gestión y Productividad de Aplicadores

Aplicación web empresarial construida con **Next.js 14 + TypeScript + Tailwind CSS + Supabase (PostgreSQL, Auth y Storage)**. Todos los datos se guardan en una base de datos real; no hay datos ficticios.

---

## Puesta en marcha (≈10 minutos)

### 1. Crear el proyecto en Supabase (gratis)
1. Entra a https://supabase.com y crea una cuenta.
2. Crea un **New project** (nombre: `centro-fester`, región más cercana, guarda la contraseña de la BD).
3. Espera 1-2 minutos a que el proyecto se aprovisione.

### 2. Crear la base de datos
1. En el panel de Supabase abre **SQL Editor → New query**.
2. Copia TODO el contenido del archivo `supabase/schema.sql` y ejecútalo (**Run**).
3. Verás "Success". Esto crea las 12 tablas, relaciones, seguridad por roles (RLS), el bucket de fotografías y los catálogos precargados (zonas, categorías, materiales y garantías).

### 3. Crear tu usuario administrador
1. En Supabase: **Authentication → Users → Add user → Create new user**.
   - Email: `admin@centrofester.app`
   - Password: la que tú elijas
   - Marca **Auto Confirm User**.
2. En **SQL Editor** ejecuta:
   ```sql
   update perfiles set rol = 'admin', nombre = 'Administrador' where usuario = 'admin';
   ```

### 4. Conectar la aplicación
1. En Supabase: **Project Settings → API**. Copia `Project URL`, `anon public` y `service_role`.
2. En la carpeta del proyecto, renombra `.env.local.example` a `.env.local` y pega los tres valores.

### 5. Ejecutar
```bash
npm install
npm run dev
```
Abre http://localhost:3000 e inicia sesión con usuario `admin` y tu contraseña.

### 6. Desplegar en producción (opcional, gratis)
1. Sube el proyecto a GitHub.
2. En https://vercel.com importa el repositorio.
3. Agrega las 3 variables de entorno de `.env.local` y haz **Deploy**.

---

## Flujo de uso

1. **Admin → Aplicadores**: registra a cada aplicador (nombre, zona, teléfono, fecha de ingreso).
2. **Admin → Usuarios**: crea la cuenta de acceso de cada aplicador y vincúlala con su registro del catálogo. El aplicador entra solo con usuario y contraseña.
3. **Aplicador → Registrar Actividad**: captura fecha, zona, cliente, obra, categoría → material → garantía (catálogos en cascada, sin texto libre), m², horas, observaciones y las **3 fotos obligatorias** (antes / durante / después). Sin las 3 fotos el registro no se guarda.
4. **Admin**: dashboards ejecutivo, productividad, por material (sin mezclar materiales: Acriton 8 años solo contra Acriton 8 años), por zona, bonos semanales con podio 🥇🥈🥉, inteligencia operativa con insights automáticos, y reportes PDF / Excel / CSV.

## Roles y permisos (aplicados en la base de datos con RLS)

| Acción | Admin | Aplicador |
|---|---|---|
| Ver todos los registros | ✔ | ✘ (solo los suyos) |
| Editar / eliminar registros | ✔ | ✘ |
| Catálogos, usuarios, bonos, dashboards, reportes | ✔ | ✘ |
| Registrar actividades con evidencias | ✔ | ✔ |

La restricción no es solo visual: las políticas Row Level Security de PostgreSQL impiden a un aplicador leer datos ajenos aunque manipule la API.

## Estructura del proyecto

```
supabase/schema.sql      ← SQL completo (tablas, RLS, storage, seeds)
src/middleware.ts        ← protección de rutas (sesión obligatoria)
src/app/login            ← inicio de sesión
src/app/(app)/…          ← dashboards, registros, catálogos, usuarios, reportes
src/app/api/usuarios     ← creación de usuarios (clave service_role, solo servidor)
src/components           ← Shell, filtros, KPI, logo, guardas de rol
src/lib                  ← consultas, analítica, exportaciones (Excel/CSV/PDF)
```

## Respaldo de información
Supabase realiza respaldos automáticos diarios (plan gratuito: 7 días). Además puedes exportar todos los registros a Excel/CSV desde **Reportes** en cualquier momento.

## Logotipo
El logo actual es un SVG provisional (`src/components/Logo.tsx`). Para usar el oficial, reemplaza el contenido de ese componente por tu imagen (`<img src="/logo.png" …/>` con el archivo en `public/`).
