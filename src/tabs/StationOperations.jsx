import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import ChartCard from '../components/ChartCard';
import Heatmap from '../components/Heatmap';

const BUCKET_ORDER = ['0-5 min', '5-10 min', '10-15 min', '15-20 min', '20-30 min', '30-60 min', '60+ min'];

function Insight({ children }) {
  return (
    <p className="text-xs text-gray-500 italic bg-gray-50 rounded-lg px-3 py-2 mt-3">{children}</p>
  );
}

export default function StationOperations({ data }) {
  const { monthlyHourlyByDay = [], monthlyStationFlow = [], monthlyDurationDist = [] } = data;

  // Aggregate hourly-by-day from filtered monthly data
  const hourlyMap = {};
  for (const d of monthlyHourlyByDay) {
    const key = `${d.day}-${d.hour}`;
    hourlyMap[key] = (hourlyMap[key] || 0) + d.trips;
  }
  const hourlyByDay = Object.entries(hourlyMap).map(([key, trips]) => {
    const [day, hour] = key.split('-');
    return { day, hour: parseInt(hour), trips };
  });

  // Aggregate station flow from filtered monthly data
  const flowMap = {};
  for (const s of monthlyStationFlow) {
    if (!flowMap[s.name]) flowMap[s.name] = { departures: 0, arrivals: 0 };
    flowMap[s.name].departures += s.departures;
    flowMap[s.name].arrivals += s.arrivals;
  }
  const flowData = Object.entries(flowMap)
    .map(([name, { departures, arrivals }]) => ({
      name: name.length > 28 ? name.substring(0, 26) + '…' : name,
      fullName: name,
      net: arrivals - departures,
      arrivals,
      departures,
    }))
    .sort((a, b) => b.net - a.net)
    .slice(0, 15);

  // Aggregate duration distribution from filtered monthly data
  const durMap = {};
  for (const d of monthlyDurationDist) {
    durMap[d.bucket] = (durMap[d.bucket] || 0) + d.count;
  }
  const durationDistribution = BUCKET_ORDER.map((bucket) => ({ bucket, count: durMap[bucket] || 0 }));

  // Duration insight
  const totalDurTrips = durationDistribution.reduce((s, d) => s + d.count, 0);
  const under15 = durationDistribution.slice(0, 3).reduce((s, d) => s + d.count, 0);
  const under15pct = totalDurTrips > 0 ? Math.round((under15 / totalDurTrips) * 100) : 0;

  return (
    <div className="tab-content space-y-5">
      {/* Heatmap */}
      <ChartCard
        title="Trip Volume Heatmap"
        subtitle="When do people ride? Rush-hour commutes light up the weekday mornings and evenings"
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
        <Insight>
          The 8 AM and 5 PM weekday peaks reveal Boston's bike commuters heading to work and back. Weekends show a midday leisure pattern instead.
        </Insight>
      </ChartCard>

      {/* Flow + Duration row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Station Net Flow"
          subtitle="Where do bikes pile up? Green stations need fewer bikes, red stations need more"
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
          <Insight>
            Rebalancing crews use this data to move bikes from overflow stations (green) to high-demand ones (red) — keeping docks available for the next rider.
          </Insight>
        </ChartCard>

        <ChartCard
          title="Trip Duration Distribution"
          subtitle="Most rides are quick trips — errands, commutes, or connecting to the T"
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
          {under15pct > 0 && (
            <Insight>
              {under15pct}% of all rides are under 15 minutes — bikeshare works as a "last mile" solution, getting people from transit stops to their final destination.
            </Insight>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
