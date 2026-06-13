import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Registro } from '@/types/db';
import { claveMaterial } from '@/lib/registros';

function filas(registros: Registro[]) {
  return registros.map((r) => ({
    Fecha: r.fecha,
    Aplicador: r.aplicadores?.nombre_completo ?? '',
    Zona: r.zonas?.nombre ?? '',
    Cliente: r.clientes?.nombre ?? '',
    Obra: r.obras?.nombre ?? '',
    Categoría: r.categorias?.nombre ?? '',
    Material: r.materiales?.nombre ?? '',
    'Garantía/Espesor': r.garantias?.etiqueta ?? '',
    'm²': Number(r.m2),
    Horas: Number(r.horas),
    'm²/hora': Number(r.horas) > 0 ? Number((Number(r.m2) / Number(r.horas)).toFixed(2)) : 0,
    Observaciones: r.observaciones ?? '',
  }));
}

export function exportarExcel(registros: Registro[], nombre = 'registros-fester') {
  const ws = XLSX.utils.json_to_sheet(filas(registros));
  ws['!cols'] = [{ wch: 11 }, { wch: 24 }, { wch: 16 }, { wch: 20 }, { wch: 26 }, { wch: 24 }, { wch: 20 }, { wch: 14 }, { wch: 9 }, { wch: 8 }, { wch: 9 }, { wch: 30 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Registros');
  XLSX.writeFile(wb, `${nombre}.xlsx`);
}

export function exportarCSV(registros: Registro[], nombre = 'registros-fester') {
  const ws = XLSX.utils.json_to_sheet(filas(registros));
  const csv = '\uFEFF' + XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${nombre}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportarPDF(
  registros: Registro[],
  opts: { titulo: string; periodo: string; nombre?: string }
) {
  const doc = new jsPDF({ orientation: 'landscape' });

  // Encabezado corporativo
  doc.setFillColor(0, 59, 122);
  doc.rect(0, 0, 297, 26, 'F');
  doc.setFillColor(214, 0, 28);
  doc.rect(0, 26, 297, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('CENTRO FESTER URUAPAN', 14, 11);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(opts.titulo, 14, 18);
  doc.text(opts.periodo, 14, 23);
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 220, 11);

  // Resumen
  const totalM2 = registros.reduce((s, r) => s + Number(r.m2), 0);
  const totalHoras = registros.reduce((s, r) => s + Number(r.horas), 0);
  const obras = new Set(registros.map((r) => r.obra_id)).size;
  const aplicadores = new Set(registros.map((r) => r.aplicador_id)).size;
  doc.setTextColor(0, 59, 122);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Total: ${totalM2.toLocaleString('es-MX')} m²   |   ${obras} obras   |   ${aplicadores} aplicadores   |   ${totalHoras.toLocaleString('es-MX')} horas   |   Productividad media: ${totalHoras > 0 ? (totalM2 / totalHoras).toFixed(1) : '0'} m²/h`,
    14, 35
  );

  autoTable(doc, {
    startY: 40,
    head: [['Fecha', 'Aplicador', 'Zona', 'Cliente', 'Obra', 'Material', 'm²', 'Horas', 'm²/h']],
    body: registros.map((r) => [
      r.fecha,
      r.aplicadores?.nombre_completo ?? '',
      r.zonas?.nombre ?? '',
      r.clientes?.nombre ?? '',
      r.obras?.nombre ?? '',
      claveMaterial(r),
      Number(r.m2).toLocaleString('es-MX'),
      Number(r.horas).toLocaleString('es-MX'),
      Number(r.horas) > 0 ? (Number(r.m2) / Number(r.horas)).toFixed(1) : '0',
    ]),
    styles: { fontSize: 7.5, cellPadding: 1.5 },
    headStyles: { fillColor: [0, 59, 122], fontSize: 8 },
    alternateRowStyles: { fillColor: [244, 246, 248] },
  });

  doc.save(`${opts.nombre ?? 'reporte-fester'}.pdf`);
}
