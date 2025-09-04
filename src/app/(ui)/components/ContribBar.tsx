export default function ContribBar({ label, score, contribution }:{ label:string; score:number; contribution:number }){
  const s = Math.max(0, Math.min(100, score));
  const c = Math.max(0, Math.min(100, contribution));
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-700">{label}</span>
        <span className="text-gray-500">{s} → +{c}</span>
      </div>
      <div className="w-full h-2 rounded bg-gray-200 overflow-hidden">
        <div className="h-2 rounded bg-gradient-to-r from-emerald-400 to-sky-400" style={{ width: c + "%" }}/>
      </div>
    </div>
  );
}
