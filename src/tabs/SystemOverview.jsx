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
  const { monthlyTrips, monthlyDuration, monthlyStationCount, monthlyDayOfWeek, monthlyTopStations, topStations } = data;

  // --- KPIs: computed dynamically from filtered monthly data ---
  const totalMember = monthlyTrips.reduce((s, m) => s + m.member, 0);
  const totalCasual = monthlyTrips.reduce((s, m) => s + m.casual, 0);
  const filteredTotalTrips =
    userType === 'Member' ? totalMember :
    userType === 'Casual' ? totalCasual :
    totalMember + totalCasual;

  const filteredMemberPct =
    totalMember + totalCasual > 0
      ? Math.round((totalMember / (totalMember + totalCasual)) * 1000) / 10
      : 0;

  // Avg Duration: from monthlyDuration, filtered by period + userType
  let durSum = 0, durCount = 0;
  for (const m of monthlyDuration) {
    if (userType === 'Member') { durSum += m.memberDurSum; durCount += m.memberDurCount; }
    else if (userType === 'Casual') { durSum += m.casualDurSum; durCount += m.casualDurCount; }
    else { durSum += m.memberDurSum + m.casualDurSum; durCount += m.memberDurCount + m.casualDurCount; }
  }
  const filteredAvgDuration = durCount > 0 ? Math.round((durSum / durCount) * 10) / 10 : 0;

  // Active Stations: max of selected months (union can't be computed from counts alone)
  const filteredActiveStations = monthlyStationCount.length > 0
    ? Math.max(...monthlyStationCount.map((m) => m.count))
    : 0;

  // --- Charts ---
  // Monthly line chart
  const filteredMonthly = monthlyTrips.map((m) => {
    if (userType === 'Member') return { ...m, casual: 0 };
    if (userType === 'Casual') return { ...m, member: 0 };
    return m;
  });

  // Pie chart: from filtered monthly data
  const pieData = [
    { name: 'Member', value: totalMember },
    { name: 'Casual', value: totalCasual },
  ];

  // Day of Week: aggregate from monthlyDayOfWeek (already period-filtered)
  const dowMap = {};
  for (const d of monthlyDayOfWeek) {
    if (!dowMap[d.day]) dowMap[d.day] = { day: d.day, member: 0, casual: 0 };
    dowMap[d.day].member += d.member;
    dowMap[d.day].casual += d.casual;
  }
  const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const filteredDow = DAY_ORDER.map((day) => {
    const d = dowMap[day] || { day, member: 0, casual: 0 };
    if (userType === 'Member') return { ...d, casual: 0 };
    if (userType === 'Casual') return { ...d, member: 0 };
    return d;
  });

  // Top 10 Stations: aggregate from monthlyTopStations (already period-filtered)
  const stationMap = {};
  for (const s of monthlyTopStations) {
    stationMap[s.name] = (stationMap[s.name] || 0) + s.trips;
  }
  const filteredTopStations = topStations
    .map((s) => ({ name: s.name, trips: stationMap[s.name] || 0 }))
    .sort((a, b) => b.trips - a.trips)
    .slice(0, 10);

  return (
    <div className="tab-content space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Trips" value={filteredTotalTrips.toLocaleString()} icon={Bike} color="blue" />
        <KpiCard label="Avg Duration" value={`${filteredAvgDuration} min`} icon={Clock} color="orange" />
        <KpiCard label="Active Stations" value={filteredActiveStations.toLocaleString()} icon={MapPin} color="green" />
        <KpiCard label="Member %" value={`${filteredMemberPct}%`} icon={UserCheck} color="navy" />
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

        <ChartCard title="User Type Split" subtitle="Member vs casual ratio for selected period">
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
        <ChartCard title="Trips by Day of Week" subtitle="Weekly demand pattern for selected period">
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

        <ChartCard title="Top 10 Stations" subtitle="Ranked by total trips for selected period">
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {filteredTopStations.map((s, i) => {
              const maxTrips = filteredTopStations[0]?.trips || 1;
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
