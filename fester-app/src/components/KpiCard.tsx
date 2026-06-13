export default function KpiCard({ titulo, valor, sub, acento = false }: { titulo: string; valor: string; sub?: string; acento?: boolean }) {
  return (
    <div className={`card ${acento ? 'border-l-4 border-l-fester-red' : 'border-l-4 border-l-fester-blue'}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</div>
      <div className="mt-1 text-3xl font-extrabold text-fester-blue">{valor}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}
