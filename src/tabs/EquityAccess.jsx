import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import ChartCard from '../components/ChartCard';

const MONTH_LABEL = (m) => {
  const [, mm] = m.split('-');
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(mm,10)-1];
};

const TOP_COLORS = ['#0B1D3A', '#1B4F72', '#2E86DE'];
const BOT_COLORS = ['#E67E22', '#F0B27A', '#F5CBA7'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.stroke }}>
          {p.name}: <span className="font-mono font-semibold">{p.value?.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

export default function EquityAccess({ data, userType }) {
  const { municipalityTrips, monthlyByMunicipality, trendMunicipalities } = data;

  const barData = municipalityTrips.map((m) => ({
    municipality: m.municipality,
    trips: userType === 'Member' ? m.member : userType === 'Casual' ? m.casual : m.trips,
    member: m.member,
    casual: m.casual,
  }));

  const splitData = municipalityTrips.map((m) => ({
    municipality: m.municipality,
    Member: m.member,
    Casual: m.casual,
  }));

  return (
    <div className="tab-content space-y-5">
      {/* Municipality bar charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Trips by Municipality"
          subtitle="Total trip volume originating from each municipality"
        >
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="municipality" width={90} tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="trips" fill="#2E86DE" radius={[0, 4, 4, 0]} name="Trips" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Member vs Casual by Municipality"
          subtitle="Stacked user type breakdown per municipality"
        >
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={splitData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="municipality" width={90} tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Member" stackId="a" fill="#2E86DE" name="Member" />
              <Bar dataKey="Casual" stackId="a" fill="#E67E22" radius={[0, 4, 4, 0]} name="Casual" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Trend chart */}
      <ChartCard
        title="Monthly Trends: Top 3 vs Bottom 3 Municipalities"
        subtitle="Tracking whether the ridership gap between high- and low-usage municipalities is closing or widening"
      >
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={monthlyByMunicipality}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="month" tickFormatter={MONTH_LABEL} tick={{ fontSize: 11, fill: '#64748B' }} />
            <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {trendMunicipalities.top3.map((muni, i) => (
              <Area
                key={muni}
                type="monotone"
                dataKey={muni}
                stroke={TOP_COLORS[i]}
                fill={TOP_COLORS[i]}
                fillOpacity={0.08}
                strokeWidth={2}
                name={`${muni} (top)`}
              />
            ))}
            {trendMunicipalities.bottom3.map((muni, i) => (
              <Area
                key={muni}
                type="monotone"
                dataKey={muni}
                stroke={BOT_COLORS[i]}
                fill={BOT_COLORS[i]}
                fillOpacity={0.08}
                strokeWidth={2}
                strokeDasharray="5 5"
                name={`${muni} (bottom)`}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
