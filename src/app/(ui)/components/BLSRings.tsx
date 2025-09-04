import ProgressRing from "./ProgressRing";

export default function BLSRings({ breakdown }:{ breakdown:{ originality:number; clarity:number; evidence:number; structure:number; voice:number; mechanics:number } }){
  const items = [
    { key:"Originality", val: breakdown.originality, tone:"text-emerald-600" },
    { key:"Clarity",     val: breakdown.clarity,     tone:"text-sky-600" },
    { key:"Evidence",    val: breakdown.evidence,    tone:"text-indigo-600" },
    { key:"Structure",   val: breakdown.structure,   tone:"text-amber-600" },
    { key:"Voice",       val: breakdown.voice,       tone:"text-fuchsia-600" },
    { key:"Mechanics",   val: breakdown.mechanics,   tone:"text-rose-600" }
  ];
  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-600">Six dimensions of quality (weights: 35/25/15/10/10/5).</div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 place-items-center">
        {items.map((it,i)=>(
          <div key={i} className={`min-w-0 ${it.tone} text-center`}>
            <div className="flex flex-col items-center">
              <ProgressRing value={it.val} size={92} stroke={9} label={it.key}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
