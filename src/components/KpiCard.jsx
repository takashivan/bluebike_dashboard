export default function KpiCard({ label, value, icon: Icon, color = 'blue' }) {
  const colorMap = {
    blue: 'bg-blue-pale text-blue',
    orange: 'bg-orange-light/20 text-orange',
    green: 'bg-green/10 text-green',
    navy: 'bg-navy/10 text-navy',
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.blue}`}>
        {Icon && <Icon size={22} />}
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-800 font-mono mt-0.5">{value}</p>
      </div>
    </div>
  );
}
