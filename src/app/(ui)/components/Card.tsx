export default function Card({ title, children }:{ title:string; children:any }){
  return (
    <section className="rounded-2xl border border-gray-200 p-5 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}
