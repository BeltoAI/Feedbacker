export default function ProgressRing({ value, size=96, stroke=10, label }:{ value:number; size?:number; stroke?:number; label?:string }){
  const pct=Math.max(0,Math.min(100,Math.round(value||0)));
  const r=(size/2)-stroke; const c=2*Math.PI*r; const dash=(pct/100)*c; const off=c-dash;
  return (
    <div className="inline-block text-current" style={{width:size,height:size}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        <circle cx={size/2} cy={size/2} r={r} stroke="currentColor" opacity="0.15" strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke="currentColor" strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={`${c} ${c}`} strokeDashoffset={off}
          style={{ transform:"rotate(-90deg)", transformOrigin:"50% 50%" }}/>
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="fill-current" style={{fontSize: size*0.28, fontWeight:600}}>{pct}</text>
      </svg>
      {label && <div className="text-xs text-gray-700 text-center mt-1 truncate">{label}</div>}
    </div>
  );
}
