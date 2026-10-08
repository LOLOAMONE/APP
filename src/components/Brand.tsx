import Image from "next/image";
export function Brand({ compact = false }: { compact?: boolean }) {
  return <span className={`inline-flex items-center justify-center rounded-2xl bg-brand-600 ${compact ? "px-4 py-2" : "w-full px-5 py-4"}`}><Image src="/amone-logo-beige.png" alt="Amoné" width={3876} height={2106} unoptimized priority className={`${compact ? "w-24" : "w-28"} h-auto`} /></span>;
}
