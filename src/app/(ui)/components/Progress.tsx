export function Bar({ label, value }:{ label:string; value:number }){
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1"><span>{label}</span><span>{v}</span></div>
      <div className="w-full h-3 bg-gray-200 rounded">
        <div className="h-3 rounded" style={{ width: v + "%" }}/>
      </div>
    </div>
  );
}
