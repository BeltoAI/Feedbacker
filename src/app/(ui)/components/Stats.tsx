import { BookOpenCheck, Link, Quote, Sparkles, AlignLeft, Type, AlertTriangle } from "lucide-react";

function severityColor(v: number, goodLow = true) {
  const val = Math.max(0, Math.min(100, Math.round(v)));
  const score = goodLow ? (100 - val) : val;
  if (score >= 70) return "bg-red-100 text-red-700";
  if (score >= 40) return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}
export function StatTile({ label, value, hint, icon }: { label: string; value: string | number; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4 bg-white shadow-sm">
      <div className="flex items-center gap-3">
        <div className="shrink-0">{icon}</div>
        <div className="flex-1">
          <div className="text-xs text-gray-500">{label}</div>
          <div className="text-xl font-semibold">{value}</div>
          {hint && <div className="text-xs text-gray-500 mt-1">{hint}</div>}
        </div>
      </div>
    </div>
  );
}
export function ReadabilityPills({ flesch, fk, gunning, smog, lix, ari, coleman }:{
  flesch:number; fk:number; gunning:number; smog:number; lix:number; ari:number; coleman:number;
}) {
  const dif = (x:number, min:number, max:number)=> Math.max(0, Math.min(100, ((x - min) * 100) / (max - min)));
  const pills = [
    { label: "Flesch", value: `${flesch.toFixed(1)}`, sev: dif(100 - flesch, 0, 100) },
    { label: "FK Grade", value: fk.toFixed(1), sev: dif(fk, 5, 18) },
    { label: "Gunning", value: gunning.toFixed(1), sev: dif(gunning, 6, 20) },
    { label: "SMOG", value: smog.toFixed(1), sev: dif(smog, 6, 20) },
    { label: "LIX", value: lix.toFixed(1), sev: dif(lix, 20, 70) },
    { label: "ARI", value: ari.toFixed(1), sev: dif(ari, 5, 20) },
    { label: "Coleman-Liau", value: coleman.toFixed(1), sev: dif(coleman, 5, 20) }
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {pills.map((p, i) => (
        <span key={i} className={`px-2 py-1 rounded-full text-xs ${severityColor(p.sev,false)}`}>{p.label}: {p.value}</span>
      ))}
    </div>
  );
}
export function Badge({ level }:{ level:"LOW"|"MEDIUM"|"HIGH" }) {
  const cls = level==="HIGH" ? "bg-red-100 text-red-700"
    : level==="MEDIUM" ? "bg-yellow-100 text-yellow-700"
    : "bg-green-100 text-green-700";
  return <span className={`px-2 py-1 rounded-full text-xs ${cls}`}>{level}</span>;
}
export const Icons = { BookOpenCheck, Link, Quote, Sparkles, AlignLeft, Type, AlertTriangle };
