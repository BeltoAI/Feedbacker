export default function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
      <div className="text-lg mb-3">{title}</div>
      <div>{children}</div>
    </div>
  );
}
