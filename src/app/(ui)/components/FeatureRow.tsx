export default function FeatureRow({ label, value, bar }:{ label:string; value:string|number; bar:number }){
  const v = Math.max(0, Math.min(100, Math.round(bar)));
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-700">{label}</span>
        <span className="text-gray-500">{value}</span>
      </div>
      <div className="w-full h-2 rounded bg-gray-200 overflow-hidden">
        <div className="h-2 rounded bg-gradient-to-r from-indigo-500 to-fuchsia-500" style={{ width: v + "%" }}/>
      </div>
    </div>
  );
}
