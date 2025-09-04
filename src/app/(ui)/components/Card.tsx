export default function Card({ title, children }:{ title?:string; children:any }){
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {title && (
        <header className="px-4 sm:px-6 py-3 border-b bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-800 truncate">{title}</h2>
        </header>
      )}
      <div className="p-4 sm:p-6 space-y-3">{children}</div>
    </section>
  );
}
