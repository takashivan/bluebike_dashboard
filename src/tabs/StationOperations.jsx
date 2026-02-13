import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import ChartCard from '../components/ChartCard';
import Heatmap from '../components/Heatmap';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <span className="font-mono font-semibold">{Math.abs(p.value)?.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

export default function StationOperations({ data }) {
  const { hourlyByDay, stationFlow, durationDistribution } = data;

  // Sort station flow by net value for diverging bar
  const flowData = [...stationFlow]
    .sort((a, b) => b.net - a.net)
    .slice(0, 15)
    .map((s) => ({
      name: s.name.length > 28 ? s.name.substring(0, 26) + '…' : s.name,
      fullName: s.name,
      net: s.net,
      arrivals: s.arrivals,
      departures: s.departures,
    }));

  return (
    <div className="tab-content space-y-5">
      {/* Heatmap */}
      <ChartCard
        title="Trip Volume Heatmap"
        subtitle="Hour of day vs day of week — darker cells indicate higher trip volume"
      >
        <div className="overflow-x-auto">
          <Heatmap data={hourlyByDay} width={780} height={260} />
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
          <span>Low</span>
          <div className="flex h-3 rounded overflow-hidden">
            {['#EBF5FB', '#AED6F1', '#5DADE2', '#2E86DE', '#1B4F72', '#0B1D3A'].map((c) => (
              <div key={c} style={{ background: c, width: 32, height: 12 }} />
            ))}
          </div>
          <span>High</span>
        </div>
      </ChartCard>

      {/* Flow + Duration row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Station Net Flow"
          subtitle="Arrivals minus departures — green = net inflow, red = net outflow"
        >
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={flowData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(v) => v.toLocaleString()} />
              <YAxis
                type="category"
                dataKey="name"
                width={180}
                tick={{ fontSize: 10, fill: '#64748B' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white border border-gray-200 shadow-lg rounded-lg px-3 py-2 text-xs">
                      <p className="font-semibold text-gray-700 mb-1">{d.fullName}</p>
                      <p className="text-green">Arrivals: <span className="font-mono font-semibold">{d.arrivals.toLocaleString()}</span></p>
                      <p className="text-red">Departures: <span className="font-mono font-semibold">{d.departures.toLocaleString()}</span></p>
                      <p className={d.net >= 0 ? 'text-green' : 'text-red'}>
                        Net: <span className="font-mono font-semibold">{d.net >= 0 ? '+' : ''}{d.net.toLocaleString()}</span>
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="net" radius={[0, 4, 4, 0]} name="Net Flow">
                {flowData.map((entry, i) => (
                  <Cell key={i} fill={entry.net >= 0 ? '#27AE60' : '#E74C3C'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Trip Duration Distribution"
          subtitle="Histogram of trip lengths in minutes"
        >
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={durationDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-white border border-gray-200 shadow-lg rounded-lg px-3 py-2 text-xs">
                      <p className="font-semibold text-gray-700 mb-1">{label}</p>
                      <p className="text-blue">Trips: <span className="font-mono font-semibold">{payload[0].value?.toLocaleString()}</span></p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" fill="#2E86DE" radius={[4, 4, 0, 0]} name="Trips" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
