import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';
import { Bike, Clock, MapPin, UserCheck } from 'lucide-react';
import KpiCard from '../components/KpiCard';
import ChartCard from '../components/ChartCard';

const COLORS = ['#2E86DE', '#E67E22'];
const MONTH_LABEL = (m) => {
  const [, mm] = m.split('-');
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(mm,10)-1];
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <span className="font-mono font-semibold">{p.value?.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

export default function SystemOverview({ data, userType }) {
  const { kpis, monthlyTrips, dayOfWeek, topStations, userTypeSplit } = data;

  const filteredMonthly = monthlyTrips.map((m) => {
    if (userType === 'Member') return { ...m, casual: 0 };
    if (userType === 'Casual') return { ...m, member: 0 };
    return m;
  });

  const filteredDow = dayOfWeek.map((d) => {
    if (userType === 'Member') return { ...d, casual: 0 };
    if (userType === 'Casual') return { ...d, member: 0 };
    return d;
  });

  const pieData = [
    { name: 'Member', value: userTypeSplit.member },
    { name: 'Casual', value: userTypeSplit.casual },
  ];

  return (
    <div className="tab-content space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Trips" value={kpis.totalTrips.toLocaleString()} icon={Bike} color="blue" />
        <KpiCard label="Avg Duration" value={`${kpis.avgDurationMin} min`} icon={Clock} color="orange" />
        <KpiCard label="Active Stations" value={kpis.activeStations.toLocaleString()} icon={MapPin} color="green" />
        <KpiCard label="Member %" value={`${kpis.memberPct}%`} icon={UserCheck} color="navy" />
      </div>

      {/* Line + Donut row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard title="Monthly Ridership" subtitle="Member vs casual trips over time" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={filteredMonthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tickFormatter={MONTH_LABEL} tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="member" stroke="#2E86DE" strokeWidth={2.5} dot={{ r: 3 }} name="Member" />
              <Line type="monotone" dataKey="casual" stroke="#E67E22" strokeWidth={2.5} dot={{ r: 3 }} name="Casual" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="User Type Split" subtitle="Overall member vs casual ratio">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                labelLine={false}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => v.toLocaleString()} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Bar + Table row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Trips by Day of Week" subtitle="Weekly demand pattern for member and casual riders">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={filteredDow}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="member" fill="#2E86DE" radius={[4,4,0,0]} name="Member" />
              <Bar dataKey="casual" fill="#E67E22" radius={[4,4,0,0]} name="Casual" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top 10 Stations" subtitle="Ranked by total trips (departures + arrivals)">
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {topStations.slice(0, 10).map((s, i) => {
              const maxTrips = topStations[0].trips;
              const pct = (s.trips / maxTrips) * 100;
              return (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-400 w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 truncate">{s.name}</p>
                    <div className="h-2 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-blue rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-mono text-gray-600 w-16 text-right">{s.trips.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
