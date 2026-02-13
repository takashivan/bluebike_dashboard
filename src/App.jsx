import { useState, useEffect } from 'react';
import { LayoutDashboard, Radio, Scale, Info } from 'lucide-react';
import FilterBar from './components/FilterBar';
import SystemOverview from './tabs/SystemOverview';
import StationOperations from './tabs/StationOperations';
import EquityAccess from './tabs/EquityAccess';
import About from './tabs/About';

const TABS = [
  { id: 'overview', label: 'System Overview', icon: LayoutDashboard },
  { id: 'stations', label: 'Station Operations', icon: Radio },
  { id: 'equity', label: 'Equity & Access', icon: Scale },
  { id: 'about', label: 'About', icon: Info },
];

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [userType, setUserType] = useState('All');
  const [selectedMonths, setSelectedMonths] = useState(['2025-01', '2025-12']);

  useEffect(() => {
    fetch('/data/bluebikes-2025.json')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading Bluebikes data...</p>
        </div>
      </div>
    );
  }

  // Filter data by selected months
  const monthStart = selectedMonths[0];
  const monthEnd = selectedMonths[1];
  const filteredData = {
    ...data,
    monthlyTrips: data.monthlyTrips.filter(
      (m) => m.month >= monthStart && m.month <= monthEnd
    ),
    monthlyByMunicipality: data.monthlyByMunicipality.filter(
      (m) => m.month >= monthStart && m.month <= monthEnd
    ),
  };

  const months = data.monthlyTrips.map((m) => m.month);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-navy text-white px-6 py-4 shadow-lg">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue rounded-lg flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="18" r="3" />
                <circle cx="6" cy="6" r="3" />
                <path d="M6 21V9a9 9 0 0 0 9 9" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Bluebikes Dashboard</h1>
              <p className="text-xs text-blue-pale opacity-80">2025 Trip Data Analysis</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 hidden sm:block">
            {data.kpis.totalTrips.toLocaleString()} trips &middot; {data.kpis.activeStations} stations &middot; 12 municipalities
          </p>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5">
        {/* Tabs */}
        <nav className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === id
                  ? 'bg-blue text-white shadow-md shadow-blue/20'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        {/* Filters (hidden on About tab) */}
        {activeTab !== 'about' && (
          <div className="mb-5">
            <FilterBar
              months={months}
              selectedMonths={selectedMonths}
              onMonthChange={setSelectedMonths}
              userType={userType}
              onUserTypeChange={setUserType}
            />
          </div>
        )}

        {/* Tab content */}
        {activeTab === 'overview' && <SystemOverview data={filteredData} userType={userType} />}
        {activeTab === 'stations' && <StationOperations data={filteredData} />}
        {activeTab === 'equity' && <EquityAccess data={filteredData} userType={userType} />}
        {activeTab === 'about' && <About />}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-8 py-4 px-6">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400">
          <p>Bluebikes 2025 Dashboard &middot; Class Assignment</p>
          <p>Data: Bluebikes System Data (bluebikes.com)</p>
        </div>
      </footer>
    </div>
  );
}
