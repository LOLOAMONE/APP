export function Brand({ compact = false }: { compact?: boolean }) {
  return <span aria-label="Amoné" className="inline-flex flex-col"><span className={`${compact ? "text-2xl" : "text-4xl"} font-serif font-medium leading-none tracking-[-0.05em]`}>amonē<span className="text-[0.7em] text-current opacity-50">.</span></span>{!compact && <span className="mt-3 text-[9px] font-medium uppercase tracking-[0.32em] opacity-60">La maison, au quotidien</span>}</span>;
}
