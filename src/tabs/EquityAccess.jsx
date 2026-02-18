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

function Insight({ children }) {
  return (
    <p className="text-xs text-gray-500 italic bg-gray-50 rounded-lg px-3 py-2 mt-3">{children}</p>
  );
}

export default function EquityAccess({ data, userType }) {
  const { monthlyByMunicipality = [], trendMunicipalities = { top3: [], bottom3: [] }, monthlyMunicipalityAll = [] } = data;

  // Aggregate municipality data from filtered monthly data
  const muniMap = {};
  for (const d of monthlyMunicipalityAll) {
    if (!muniMap[d.municipality]) muniMap[d.municipality] = { trips: 0, member: 0, casual: 0 };
    muniMap[d.municipality].trips += d.trips;
    muniMap[d.municipality].member += d.member;
    muniMap[d.municipality].casual += d.casual;
  }
  const muniArr = Object.entries(muniMap)
    .map(([municipality, { trips, member, casual }]) => ({ municipality, trips, member, casual }))
    .sort((a, b) => b.trips - a.trips);

  const barData = muniArr.map((m) => ({
    municipality: m.municipality,
    trips: userType === 'Member' ? m.member : userType === 'Casual' ? m.casual : m.trips,
  }));

  const splitData = muniArr.map((m) => ({
    municipality: m.municipality,
    Member: m.member,
    Casual: m.casual,
  }));

  // Equity gap insight
  const topMuni = muniArr[0];
  const botMunis = muniArr.filter((m) => m.municipality !== 'Other');
  const botMuni = botMunis[botMunis.length - 1];
  const gapRatio = topMuni && botMuni && botMuni.trips > 0
    ? Math.round(topMuni.trips / botMuni.trips)
    : 0;

  // Highest casual % municipality
  const highCasualMuni = muniArr
    .filter((m) => m.trips > 1000 && m.municipality !== 'Other')
    .sort((a, b) => (b.casual / b.trips) - (a.casual / a.trips))[0];
  const casualPct = highCasualMuni
    ? Math.round((highCasualMuni.casual / highCasualMuni.trips) * 100)
    : 0;

  return (
    <div className="tab-content space-y-5">
      {/* Municipality bar charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Trips by Municipality"
          subtitle="Where are people riding? Trip volume reveals which communities bikeshare serves most"
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
          {gapRatio > 1 && (
            <Insight>
              {topMuni.municipality} sees {gapRatio}x more rides than {botMuni.municipality} — highlighting the access gap between well-connected urban cores and underserved outer communities.
            </Insight>
          )}
        </ChartCard>

        <ChartCard
          title="Member vs Casual by Municipality"
          subtitle="Do residents commute or do visitors explore? The member/casual split tells the story"
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
          {highCasualMuni && (
            <Insight>
              {highCasualMuni.municipality} has the highest casual rider share ({casualPct}%) — likely driven by tourism, university visitors, or residents who haven't yet committed to a membership.
            </Insight>
          )}
        </ChartCard>
      </div>

      {/* Trend chart */}
      <ChartCard
        title="Monthly Trends: Top 3 vs Bottom 3 Municipalities"
        subtitle="Is the gap closing? Tracking whether bikeshare expansion is reaching underserved areas"
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
        <Insight>
          Solid lines (top municipalities) and dashed lines (bottom) reveal whether investment in new stations and bike lanes is helping close the ridership gap across Greater Boston's diverse communities.
        </Insight>
      </ChartCard>
    </div>
  );
}
