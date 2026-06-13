import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Centro Fester Uruapan | Gestión de Aplicadores',
  description: 'Sistema de Gestión y Productividad de Aplicadores',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
