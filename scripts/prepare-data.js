import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const DATA_DIR = path.resolve('BluebikeData_2025');
const OUT_FILE = path.resolve('public/data/bluebikes-2025.json');

// Station-ID prefix → municipality mapping (verified against actual station names)
const STATION_PREFIX_MUNICIPALITY = {
  A32: 'Boston',       // East Boston, Allston, Brighton
  B32: 'Boston',       // Seaport, Back Bay, Downtown
  BCB: 'Hingham',     // BCBS Hingham
  C23: 'Boston',       // Dorchester, Mattapan
  C32: 'Boston',       // Prudential, South End, Newmarket
  D32: 'Boston',       // Beacon Hill, Chinatown, South Boston
  E32: 'Boston',       // Jamaica Plain
  F32: 'Medford',     // Medford Square, West Medford
  G32: 'Malden',      // Northern Strand, Malden HS
  H32: 'Chelsea',     // Bellingham Sq, Broadway
  K32: 'Brookline',   // Coolidge Corner, Washington Sq
  L32: 'Arlington',   // Minuteman Bikeway
  M32: 'Cambridge',   // Kendall, MIT, Harvard, Porter
  N32: 'Newton',      // Washington St, Boston College area
  R32: 'Revere',      // Revere Beach, Shirley Ave
  S32: 'Somerville',  // Union Sq, Davis Sq, Assembly
  T32: 'Salem',       // Salem MBTA, Essex St
  V32: 'Everett',     // Wellington, Broadway
  W32: 'Watertown',   // Arsenal, Watertown Sq
  X32: 'Boston',      // Dorchester warehouse area
  Z32: 'Boston',      // Roxbury, Mattapan
  ZZ3: 'Somerville',  // Mystic River area
};

// Fallback: guess municipality from station name keywords
function guessMunicipality(stationName) {
  const lower = (stationName || '').toLowerCase();
  if (lower.includes('cambridge') || lower.includes('mit ') || lower.includes('harvard ') || lower.includes('kendall') || lower.includes('central sq') || lower.includes('porter sq') || lower.includes('inman'))
    return 'Cambridge';
  if (lower.includes('somerville') || lower.includes('davis sq') || lower.includes('union sq') || lower.includes('magoun'))
    return 'Somerville';
  if (lower.includes('brookline') || lower.includes('coolidge corner') || lower.includes('washington sq'))
    return 'Brookline';
  if (lower.includes('watertown'))
    return 'Watertown';
  if (lower.includes('everett'))
    return 'Everett';
  if (lower.includes('arlington'))
    return 'Arlington';
  if (lower.includes('newton'))
    return 'Newton';
  if (lower.includes('medford'))
    return 'Medford';
  if (lower.includes('revere'))
    return 'Revere';
  if (lower.includes('salem'))
    return 'Salem';
  return null;
}

function getMunicipality(stationId, stationName) {
  if (stationId) {
    const prefix = stationId.substring(0, 3);
    if (STATION_PREFIX_MUNICIPALITY[prefix]) return STATION_PREFIX_MUNICIPALITY[prefix];
  }
  const guess = guessMunicipality(stationName);
  if (guess) return guess;
  // Default to "Boston" if we can't determine
  return 'Other';
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DURATION_BUCKETS = [
  { label: '0-5 min', max: 5 },
  { label: '5-10 min', max: 10 },
  { label: '10-15 min', max: 15 },
  { label: '15-20 min', max: 20 },
  { label: '20-30 min', max: 30 },
  { label: '30-60 min', max: 60 },
  { label: '60+ min', max: Infinity },
];

// Aggregation accumulators
let totalTrips = 0;
let totalDurationMin = 0;
let validDurationCount = 0;
const stationSet = new Set();
let memberCount = 0;
let casualCount = 0;

// monthlyTrips: { 'YYYY-MM': { member: n, casual: n } }
const monthly = {};
// dayOfWeek: { 0..6: { member: n, casual: n } }
const dow = {};
for (let i = 0; i < 7; i++) dow[i] = { member: 0, casual: 0 };
// hourlyByDay: { 'day-hour': trips }
const hourlyByDay = {};
for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) hourlyByDay[`${d}-${h}`] = 0;
// Station trip counts
const stationDepartures = {};
const stationArrivals = {};
const stationCoords = {};
// Duration distribution
const durationDist = DURATION_BUCKETS.map((b) => ({ bucket: b.label, count: 0 }));
// Municipality
const municipalityTrips = {};
const municipalityMember = {};
const municipalityCasual = {};
// Monthly by municipality
const monthlyMunicipality = {};

// Process all CSV files
const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.csv')).sort();
console.log(`Found ${files.length} CSV files`);

for (const file of files) {
  const filePath = path.join(DATA_DIR, file);
  console.log(`Processing ${file}...`);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const records = parse(raw, { columns: true, skip_empty_lines: true, relax_column_count: true });

  for (const row of records) {
    const startName = row.start_station_name || '';
    const endName = row.end_station_name || '';
    const startId = row.start_station_id || '';
    const endId = row.end_station_id || '';
    const isMember = row.member_casual === 'member';

    // Skip rows without station info or outside 2025
    if (!startName && !endName) continue;
    if (!row.started_at.startsWith('2025')) continue;

    totalTrips++;

    // Duration
    const startedAt = new Date(row.started_at);
    const endedAt = new Date(row.ended_at);
    const durationMin = (endedAt - startedAt) / 60000;
    if (durationMin > 0 && durationMin < 1440) {
      totalDurationMin += durationMin;
      validDurationCount++;

      // Duration distribution
      for (let i = 0; i < DURATION_BUCKETS.length; i++) {
        if (durationMin <= DURATION_BUCKETS[i].max) {
          durationDist[i].count++;
          break;
        }
      }
    }

    // Stations
    if (startName) stationSet.add(startName);
    if (endName) stationSet.add(endName);

    // Member/casual
    if (isMember) memberCount++;
    else casualCount++;

    // Monthly
    const monthKey = row.started_at.substring(0, 7);
    if (!monthly[monthKey]) monthly[monthKey] = { member: 0, casual: 0 };
    if (isMember) monthly[monthKey].member++;
    else monthly[monthKey].casual++;

    // Day of week
    const dayIdx = startedAt.getDay();
    if (isMember) dow[dayIdx].member++;
    else dow[dayIdx].casual++;

    // Hourly by day
    const hour = startedAt.getHours();
    hourlyByDay[`${dayIdx}-${hour}`]++;

    // Station departures/arrivals
    if (startName) {
      stationDepartures[startName] = (stationDepartures[startName] || 0) + 1;
      if (row.start_lat && row.start_lng) {
        stationCoords[startName] = {
          lat: parseFloat(row.start_lat),
          lng: parseFloat(row.start_lng),
        };
      }
    }
    if (endName) {
      stationArrivals[endName] = (stationArrivals[endName] || 0) + 1;
    }

    // Municipality (based on start station)
    if (startName) {
      const muni = getMunicipality(startId, startName);
      municipalityTrips[muni] = (municipalityTrips[muni] || 0) + 1;
      if (isMember) municipalityMember[muni] = (municipalityMember[muni] || 0) + 1;
      else municipalityCasual[muni] = (municipalityCasual[muni] || 0) + 1;

      // Monthly by municipality
      if (!monthlyMunicipality[muni]) monthlyMunicipality[muni] = {};
      if (!monthlyMunicipality[muni][monthKey]) monthlyMunicipality[muni][monthKey] = 0;
      monthlyMunicipality[muni][monthKey]++;
    }
  }
}

// Build output
const monthlyTrips = Object.entries(monthly)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([month, data]) => ({ month, ...data }));

const dayOfWeek = [1, 2, 3, 4, 5, 6, 0].map((i) => ({
  day: DAY_NAMES[i],
  member: dow[i].member,
  casual: dow[i].casual,
}));

const hourlyByDayArr = [];
for (let d = 0; d < 7; d++) {
  for (let h = 0; h < 24; h++) {
    hourlyByDayArr.push({
      day: DAY_NAMES[d],
      hour: h,
      trips: hourlyByDay[`${d}-${h}`],
    });
  }
}

// Top stations by total trips (departures + arrivals)
const allStations = new Set([...Object.keys(stationDepartures), ...Object.keys(stationArrivals)]);
const stationTotals = [];
for (const name of allStations) {
  const dep = stationDepartures[name] || 0;
  const arr = stationArrivals[name] || 0;
  const coords = stationCoords[name] || { lat: 0, lng: 0 };
  stationTotals.push({
    name,
    trips: dep + arr,
    departures: dep,
    arrivals: arr,
    net: arr - dep,
    lat: coords.lat,
    lng: coords.lng,
  });
}
stationTotals.sort((a, b) => b.trips - a.trips);

const topStations = stationTotals.slice(0, 30).map(({ name, trips, lat, lng }) => ({
  name,
  trips,
  lat,
  lng,
}));

// Station flow: top 20 by absolute net
const stationFlow = [...stationTotals]
  .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
  .slice(0, 20)
  .map(({ name, departures, arrivals, net }) => ({ name, departures, arrivals, net }));

// Municipality data
const muniArr = Object.entries(municipalityTrips)
  .map(([municipality, trips]) => ({
    municipality,
    trips,
    member: municipalityMember[municipality] || 0,
    casual: municipalityCasual[municipality] || 0,
  }))
  .sort((a, b) => b.trips - a.trips);

// Monthly municipality trends (top 3 and bottom 3 excluding "Other")
const muniRanked = muniArr.filter((m) => m.municipality !== 'Other');
const top3Munis = muniRanked.slice(0, 3).map((m) => m.municipality);
const bottom3Munis = muniRanked.slice(-3).map((m) => m.municipality);
const trendMunis = [...top3Munis, ...bottom3Munis];

const months = Object.keys(monthly).sort();
const monthlyByMunicipality = months.map((month) => {
  const entry = { month };
  for (const muni of trendMunis) {
    entry[muni] = (monthlyMunicipality[muni] && monthlyMunicipality[muni][month]) || 0;
  }
  return entry;
});

const output = {
  kpis: {
    totalTrips,
    avgDurationMin: Math.round((totalDurationMin / validDurationCount) * 10) / 10,
    activeStations: stationSet.size,
    memberPct: Math.round((memberCount / totalTrips) * 1000) / 10,
  },
  monthlyTrips,
  dayOfWeek,
  hourlyByDay: hourlyByDayArr,
  topStations,
  stationFlow,
  durationDistribution: durationDist,
  municipalityTrips: muniArr,
  userTypeSplit: { member: memberCount, casual: casualCount },
  monthlyByMunicipality,
  trendMunicipalities: { top3: top3Munis, bottom3: bottom3Munis },
};

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));

console.log(`\nDone! Output: ${OUT_FILE}`);
console.log(`Total trips: ${totalTrips.toLocaleString()}`);
console.log(`Active stations: ${stationSet.size}`);
console.log(`Avg duration: ${output.kpis.avgDurationMin} min`);
console.log(`Member %: ${output.kpis.memberPct}%`);
console.log(`Municipalities: ${muniArr.map((m) => m.municipality).join(', ')}`);
