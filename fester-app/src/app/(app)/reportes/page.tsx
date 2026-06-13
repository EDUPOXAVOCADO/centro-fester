'use client';

import { useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import PageTitle from '@/components/PageTitle';
import { fetchRegistros } from '@/lib/registros';
import { iso } from '@/lib/analitica';
import { exportarCSV, exportarExcel, exportarPDF } from '@/lib/export';
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek, subMonths, subWeeks, format } from 'date-fns';
import { FileDown, FileSpreadsheet, FileText } from 'lucide-react';

export default function ReportesPage() {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const hoy = new Date();
  const [desde, setDesde] = useState(iso(startOfMonth(hoy)));
  const [hasta, setHasta] = useState(iso(hoy));

  async function generar(tipo: 'pdf' | 'excel' | 'csv', d: string, h: string, titulo: string, nombre: string) {
    setBusy(true); setMsg('');
    try {
      const regs = await fetchRegistros({ desde: d, hasta: h }, 10000);
      if (regs.length === 0) { setMsg('No hay registros en ese periodo.'); setBusy(false); return; }
      const periodo = `Periodo: ${d} al ${h}`;
      if (tipo === 'pdf') exportarPDF(regs, { titulo, periodo, nombre });
      if (tipo === 'excel') exportarExcel(regs, nombre);
      if (tipo === 'csv') exportarCSV(regs, nombre);
      setMsg(`Reporte generado (${regs.length} registros).`);
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }

  const semPas = { d: iso(startOfWeek(subWeeks(hoy, 1), { weekStartsOn: 1 })), h: iso(endOfWeek(subWeeks(hoy, 1), { weekStartsOn: 1 })) };
  const semAct = { d: iso(startOfWeek(hoy, { weekStartsOn: 1 })), h: iso(endOfWeek(hoy, { weekStartsOn: 1 })) };
  const mesPas = { d: iso(startOfMonth(subMonths(hoy, 1))), h: iso(endOfMonth(subMonths(hoy, 1))) };
  const mesAct = { d: iso(startOfMonth(hoy)), h: iso(hoy) };

  const botones = [
    { label: 'Reporte semanal PDF (semana actual)', ...semAct, tipo: 'pdf' as const, titulo: 'Reporte Semanal de Productividad', nombre: `reporte-semanal-${semAct.d}` },
    { label: 'Reporte semanal PDF (semana pasada)', ...semPas, tipo: 'pdf' as const, titulo: 'Reporte Semanal de Productividad', nombre: `reporte-semanal-${semPas.d}` },
    { label: `Reporte mensual PDF (${format(hoy, 'MM/yyyy')})`, ...mesAct, tipo: 'pdf' as const, titulo: 'Reporte Mensual de Productividad', nombre: `reporte-mensual-${format(hoy, 'yyyy-MM')}` },
    { label: `Reporte mensual PDF (${format(subMonths(hoy, 1), 'MM/yyyy')})`, ...mesPas, tipo: 'pdf' as const, titulo: 'Reporte Mensual de Productividad', nombre: `reporte-mensual-${format(subMonths(hoy, 1), 'yyyy-MM')}` },
  ];

  return (
    <AdminGuard>
      <PageTitle title="Reportes" subtitle="Genera reportes ejecutivos con la información real de la base de datos" />
      {msg && <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-fester-blue">{msg}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-bold text-fester-blue mb-4 flex items-center gap-2"><FileText size={18} /> Reportes PDF predefinidos</h2>
          <div className="space-y-2">
            {botones.map((b) => (
              <button key={b.label} className="btn-outline w-full justify-start" disabled={busy}
                onClick={() => generar(b.tipo, b.d, b.h, b.titulo, b.nombre)}>
                <FileText size={16} className="text-fester-red" /> {b.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="font-bold text-fester-blue mb-4">Exportación por periodo personalizado</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="label">Desde</label>
              <input className="input" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div>
              <label className="label">Hasta</label>
              <input className="input" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" disabled={busy} onClick={() => generar('excel', desde, hasta, '', `registros-${desde}-a-${hasta}`)}>
              <FileSpreadsheet size={16} /> Excel
            </button>
            <button className="btn-outline" disabled={busy} onClick={() => generar('csv', desde, hasta, '', `registros-${desde}-a-${hasta}`)}>
              <FileDown size={16} /> CSV
            </button>
            <button className="btn-danger" disabled={busy} onClick={() => generar('pdf', desde, hasta, 'Reporte de Productividad', `reporte-${desde}-a-${hasta}`)}>
              <FileText size={16} /> PDF
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Los archivos se descargan a tu computadora con encabezado corporativo, totales y detalle de registros.
          </p>
        </div>
      </div>
    </AdminGuard>
  );
}
