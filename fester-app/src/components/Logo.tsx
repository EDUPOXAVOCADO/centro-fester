export default function Logo({ size = 40, light = false }: { size?: number; light?: boolean }) {
  return (
    <div className="flex items-center gap-3 select-none">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Centro Fester Uruapan">
        <rect x="2" y="2" width="60" height="60" rx="12" fill="#003B7A" />
        <path d="M14 46 L32 14 L50 46 Z" fill="#D6001C" />
        <path d="M22 46 L32 28 L42 46 Z" fill="#FFFFFF" />
        <rect x="14" y="48" width="36" height="4" rx="2" fill="#FFFFFF" />
      </svg>
      <div className="leading-tight">
        <div className={`font-extrabold tracking-tight ${light ? 'text-white' : 'text-fester-blue'}`} style={{ fontSize: size * 0.38 }}>
          CENTRO FESTER
        </div>
        <div className={`font-semibold tracking-[0.3em] ${light ? 'text-red-300' : 'text-fester-red'}`} style={{ fontSize: size * 0.24 }}>
          URUAPAN
        </div>
      </div>
    </div>
  );
}
