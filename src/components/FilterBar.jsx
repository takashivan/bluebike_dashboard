import { Calendar, Users } from 'lucide-react';

export default function FilterBar({ months, selectedMonths, onMonthChange, userType, onUserTypeChange }) {
  return (
    <div className="flex flex-wrap items-center gap-4 bg-white rounded-xl shadow-sm border border-gray-200 px-5 py-3">
      <div className="flex items-center gap-2 text-xs text-gray-500 font-medium uppercase tracking-wide">
        <Calendar size={14} />
        <span>Period</span>
      </div>
      <div className="flex items-center gap-1">
        <select
          value={selectedMonths[0]}
          onChange={(e) => onMonthChange([e.target.value, selectedMonths[1]])}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue/30"
        >
          {months.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <span className="text-gray-400 text-sm">to</span>
        <select
          value={selectedMonths[1]}
          onChange={(e) => onMonthChange([selectedMonths[0], e.target.value])}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue/30"
        >
          {months.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className="w-px h-6 bg-gray-200 mx-1" />

      <div className="flex items-center gap-2 text-xs text-gray-500 font-medium uppercase tracking-wide">
        <Users size={14} />
        <span>User Type</span>
      </div>
      <div className="flex rounded-lg overflow-hidden border border-gray-200">
        {['All', 'Member', 'Casual'].map((type) => (
          <button
            key={type}
            onClick={() => onUserTypeChange(type)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              userType === type
                ? 'bg-blue text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            {type}
          </button>
        ))}
      </div>
    </div>
  );
}
