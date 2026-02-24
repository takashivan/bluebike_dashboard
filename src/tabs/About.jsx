import { Target, User, ClipboardList, BarChart3 } from 'lucide-react';

function Section({ icon: Icon, title, children, accent = 'blue' }) {
  const accentMap = {
    blue: 'bg-blue/10 text-blue',
    orange: 'bg-orange/10 text-orange',
    green: 'bg-green/10 text-green',
    navy: 'bg-navy/10 text-navy-light',
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accentMap[accent]}`}>
          <Icon size={20} />
        </div>
        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function About() {
  return (
    <div className="tab-content space-y-5 max-w-4xl">
      <Section icon={Target} title="Problem Statement" accent="navy">
        <p className="text-sm text-gray-600 leading-relaxed">
          Boston's Bluebikes system logged over 4.7 million trips in 2024 with continued growth in 2025.
          However, ridership is unevenly distributed across the 12-municipality service area. Stations
          near Harvard and MIT see 40,000+ commute-time trips each, while neighborhoods like Roxbury and
          Dorchester see dramatically lower usage due to insufficient cycling infrastructure and station
          gaps. City planners and operations managers lack a unified, interactive view connecting ridership
          patterns to station capacity and equity gaps. This dashboard provides actionable insights from
          2025 trip data to optimize station placement, improve bike rebalancing, and close access gaps.
        </p>
      </Section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Section icon={User} title="Persona 1: Marketing Manager" accent="blue">
          <img src={`${import.meta.env.BASE_URL}images/persona_manager.jpeg`} alt="Marketing Manager persona" className="w-full h-72 object-cover object-center rounded-lg mb-3" />
          <p className="text-xs font-semibold text-blue uppercase tracking-wide mb-2">
            Marketing Manager — Bluebikes
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            Runs membership campaigns to grow annual subscribers. Needs to understand seasonal ridership
            trends and when casual rider usage peaks to time promotions effectively.
          </p>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Goals</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-blue mt-0.5">•</span>
                Track monthly ridership trends by user type
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue mt-0.5">•</span>
                Identify peak casual rider months for promotions
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue mt-0.5">•</span>
                Monitor member-to-casual conversion over time
              </li>
            </ul>
          </div>
        </Section>

        <Section icon={User} title="Persona 2: Bluebikes Rider" accent="orange">
          <img src={`${import.meta.env.BASE_URL}images/persona_user.jpeg`} alt="Bluebikes Rider persona" className="w-full h-72 object-cover object-center rounded-lg mb-3" />
          <p className="text-xs font-semibold text-orange uppercase tracking-wide mb-2">
            Daily Commuter — Bluebikes Rider
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            Uses Bluebikes for daily commuting and weekend errands. Wants to know when the system is
            busiest and which stations are most popular to plan rides and avoid empty docks.
          </p>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Goals</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-orange mt-0.5">•</span>
                See which hours and days are busiest
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange mt-0.5">•</span>
                Find which stations have the most traffic
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange mt-0.5">•</span>
                Plan rides to avoid peak congestion
              </li>
            </ul>
          </div>
        </Section>
      </div>

      <Section icon={ClipboardList} title="Design Notes" accent="green">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <p className="font-semibold text-gray-700 mb-1">Typography</p>
            <p>DM Sans for body text, JetBrains Mono for numbers and data values.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">Color Palette</p>
            <div className="flex gap-1.5 mt-1">
              {[
                { color: '#0B1D3A', label: 'Navy' },
                { color: '#1B4F72', label: 'Dark Blue' },
                { color: '#2E86DE', label: 'Blue' },
                { color: '#D6EAF8', label: 'Light Blue' },
                { color: '#E67E22', label: 'Orange' },
              ].map(({ color, label }) => (
                <div key={color} className="text-center">
                  <div className="w-8 h-8 rounded-md border border-gray-200" style={{ background: color }} />
                  <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">Chart Types Used</p>
            <p>Line charts, donut charts, grouped bars, stacked bars, heatmaps, diverging bars, histograms, area charts, and ranked tables with sparklines.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">Data Source</p>
            <p>Bluebikes trip data (January — December 2025), 4.6M+ trips across 622 stations in 12 municipalities.</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
