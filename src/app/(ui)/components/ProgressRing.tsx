export default function ProgressRing({ value, size=96, stroke=10, label }:{ value:number; size?:number; stroke?:number; label?:string }){
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (value/100)*c;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} className="shrink-0">
        <circle cx={size/2} cy={size/2} r={r} stroke="#e5e7eb" strokeWidth={stroke} fill="none"/>
        <circle cx={size/2} cy={size/2} r={r} stroke="currentColor" strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <div>
        <div className="text-4xl leading-6">{Math.round(value)}</div>
        {label && <div className="text-sm text-gray-500">{label}</div>}
      </div>
    </div>
  );
}
