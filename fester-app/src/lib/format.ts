export const fmtM2 = (n: number) =>
  new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(n) + ' m²';
export const fmtNum = (n: number) =>
  new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(n);
export const fmtFecha = (s: string) =>
  new Date(s + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

// Convierte usuario corto a email del sistema
export const usuarioAEmail = (u: string) =>
  u.includes('@') ? u.trim().toLowerCase() : `${u.trim().toLowerCase()}@centrofester.app`;
