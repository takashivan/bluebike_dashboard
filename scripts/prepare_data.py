"""
Bluebikes Data Pipeline — CSV to aggregated JSON
Processes 12 monthly trip CSVs into a single JSON file for the dashboard.
Produces the same output as prepare-data.js (Node.js version).

Usage:
    python scripts/prepare_data.py
"""

import json
import os
import glob
import numpy as np
import pandas as pd

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'BluebikeData_2025')
OUT_FILE = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'bluebikes-2025.json')

# ── Station-ID prefix → municipality mapping ─────────────────────────
STATION_PREFIX_MUNICIPALITY = {
    'A32': 'Boston',    'B32': 'Boston',    'BCB': 'Hingham',
    'C23': 'Boston',    'C32': 'Boston',    'D32': 'Boston',
    'E32': 'Boston',    'F32': 'Medford',   'G32': 'Malden',
    'H32': 'Chelsea',   'K32': 'Brookline', 'L32': 'Arlington',
    'M32': 'Cambridge', 'N32': 'Newton',    'R32': 'Revere',
    'S32': 'Somerville','T32': 'Salem',     'V32': 'Everett',
    'W32': 'Watertown', 'X32': 'Boston',    'Z32': 'Boston',
    'ZZ3': 'Somerville',
}

KEYWORD_MUNICIPALITY = [
    (['cambridge', 'mit ', 'harvard ', 'kendall', 'central sq', 'porter sq', 'inman'], 'Cambridge'),
    (['somerville', 'davis sq', 'union sq', 'magoun'], 'Somerville'),
    (['brookline', 'coolidge corner', 'washington sq'], 'Brookline'),
    (['watertown'], 'Watertown'),
    (['everett'], 'Everett'),
    (['arlington'], 'Arlington'),
    (['newton'], 'Newton'),
    (['medford'], 'Medford'),
    (['revere'], 'Revere'),
    (['salem'], 'Salem'),
]

DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
DOW_ORDER = [1, 2, 3, 4, 5, 6, 0]  # Mon-Sun display order

DURATION_BUCKETS = [
    ('0-5 min',   5),
    ('5-10 min',  10),
    ('10-15 min', 15),
    ('15-20 min', 20),
    ('20-30 min', 30),
    ('30-60 min', 60),
    ('60+ min',   float('inf')),
]


def get_municipality(station_id: str, station_name: str) -> str:
    """Map a station to its municipality via ID prefix or name keywords."""
    if pd.notna(station_id) and len(str(station_id)) >= 3:
        prefix = str(station_id)[:3]
        if prefix in STATION_PREFIX_MUNICIPALITY:
            return STATION_PREFIX_MUNICIPALITY[prefix]
    lower = str(station_name).lower() if pd.notna(station_name) else ''
    for keywords, muni in KEYWORD_MUNICIPALITY:
        if any(k in lower for k in keywords):
            return muni
    return 'Other'


def bucket_duration(minutes: float) -> str:
    """Assign a trip duration to its histogram bucket."""
    for label, ceiling in DURATION_BUCKETS:
        if minutes <= ceiling:
            return label
    return '60+ min'


def main():
    # ── Load all CSVs ─────────────────────────────────────────────────
    csv_files = sorted(glob.glob(os.path.join(DATA_DIR, '*.csv')))
    print(f'Found {len(csv_files)} CSV files')

    frames = []
    for path in csv_files:
        print(f'  Reading {os.path.basename(path)} ...')
        df = pd.read_csv(path, low_memory=False)
        frames.append(df)
    raw = pd.concat(frames, ignore_index=True)
    print(f'  Total rows loaded: {len(raw):,}')

    # ── Clean & enrich ────────────────────────────────────────────────
    raw = raw.dropna(subset=['started_at'])
    raw = raw[raw['started_at'].str.startswith('2025')]
    raw = raw[raw['start_station_name'].notna() | raw['end_station_name'].notna()]

    raw['started_at'] = pd.to_datetime(raw['started_at'], errors='coerce')
    raw['ended_at']   = pd.to_datetime(raw['ended_at'],   errors='coerce')
    raw['duration_min'] = (raw['ended_at'] - raw['started_at']).dt.total_seconds() / 60
    raw['month']   = raw['started_at'].dt.to_period('M').astype(str)
    raw['dow']     = raw['started_at'].dt.dayofweek          # 0=Mon … 6=Sun
    raw['dow_js']  = (raw['dow'] + 1) % 7                    # JS getDay: 0=Sun
    raw['hour']    = raw['started_at'].dt.hour
    raw['is_member'] = raw['member_casual'] == 'member'
    raw['municipality'] = raw.apply(
        lambda r: get_municipality(r.get('start_station_id', ''), r.get('start_station_name', '')),
        axis=1,
    )

    valid_dur = raw[(raw['duration_min'] > 0) & (raw['duration_min'] < 1440)].copy()
    valid_dur['bucket'] = valid_dur['duration_min'].apply(bucket_duration)

    total_trips = len(raw)
    member_count = int(raw['is_member'].sum())
    casual_count = total_trips - member_count

    # ── KPIs ──────────────────────────────────────────────────────────
    kpis = {
        'totalTrips':     total_trips,
        'avgDurationMin': round(valid_dur['duration_min'].mean(), 1),
        'activeStations': int(pd.concat([
            raw['start_station_name'].dropna(),
            raw['end_station_name'].dropna(),
        ]).nunique()),
        'memberPct': round(member_count / total_trips * 100, 1),
    }

    # ── Monthly trips ─────────────────────────────────────────────────
    mt = raw.groupby('month')['is_member'].agg(member='sum', casual=lambda x: (~x).sum()).reset_index()
    mt['member'] = mt['member'].astype(int)
    mt['casual'] = mt['casual'].astype(int)
    monthly_trips = mt.to_dict('records')

    months = sorted(raw['month'].unique())

    # ── Day of week ───────────────────────────────────────────────────
    dow_df = raw.groupby('dow_js')['is_member'].agg(member='sum', casual=lambda x: (~x).sum()).reset_index()
    day_of_week = []
    for di in DOW_ORDER:
        row = dow_df[dow_df['dow_js'] == di]
        day_of_week.append({
            'day': DAY_NAMES[di],
            'member': int(row['member'].iloc[0]) if len(row) else 0,
            'casual': int(row['casual'].iloc[0]) if len(row) else 0,
        })

    # ── Hourly by day ─────────────────────────────────────────────────
    hbd = raw.groupby(['dow_js', 'hour']).size().reset_index(name='trips')
    hourly_by_day = []
    for _, r in hbd.iterrows():
        hourly_by_day.append({'day': DAY_NAMES[int(r['dow_js'])], 'hour': int(r['hour']), 'trips': int(r['trips'])})

    # ── Top stations ──────────────────────────────────────────────────
    dep = raw['start_station_name'].dropna().value_counts().rename('departures')
    arr = raw['end_station_name'].dropna().value_counts().rename('arrivals')
    st = pd.DataFrame({'departures': dep, 'arrivals': arr}).fillna(0).astype(int)
    st['trips'] = st['departures'] + st['arrivals']
    st['net'] = st['arrivals'] - st['departures']
    st = st.sort_values('trips', ascending=False)

    # Coords for top 30
    coords = raw.dropna(subset=['start_station_name', 'start_lat', 'start_lng']).groupby('start_station_name')[['start_lat', 'start_lng']].first()
    top30_names = st.head(30).index.tolist()
    top_stations = []
    for name in top30_names:
        c = coords.loc[name] if name in coords.index else pd.Series({'start_lat': 0, 'start_lng': 0})
        top_stations.append({'name': name, 'trips': int(st.loc[name, 'trips']), 'lat': float(c['start_lat']), 'lng': float(c['start_lng'])})

    # Station flow: top 20 by |net|
    st_flow = st.reindex(st['net'].abs().sort_values(ascending=False).head(20).index)
    station_flow = [{'name': n, 'departures': int(r['departures']), 'arrivals': int(r['arrivals']), 'net': int(r['net'])} for n, r in st_flow.iterrows()]

    # ── Duration distribution ─────────────────────────────────────────
    dur_dist = valid_dur.groupby('bucket').size()
    duration_distribution = [{'bucket': label, 'count': int(dur_dist.get(label, 0))} for label, _ in DURATION_BUCKETS]

    # ── Municipality ──────────────────────────────────────────────────
    has_start = raw[raw['start_station_name'].notna()]
    muni_agg = has_start.groupby('municipality')['is_member'].agg(
        trips='count', member='sum', casual=lambda x: (~x).sum()
    ).reset_index().sort_values('trips', ascending=False)
    muni_agg['member'] = muni_agg['member'].astype(int)
    muni_agg['casual'] = muni_agg['casual'].astype(int)
    municipality_trips = muni_agg.to_dict('records')

    # Trend municipalities
    muni_ranked = [m for m in municipality_trips if m['municipality'] != 'Other']
    top3_munis = [m['municipality'] for m in muni_ranked[:3]]
    bot3_munis = [m['municipality'] for m in muni_ranked[-3:]]
    trend_munis = top3_munis + bot3_munis

    monthly_by_muni_df = has_start[has_start['municipality'].isin(trend_munis)].groupby(['month', 'municipality']).size().unstack(fill_value=0)
    monthly_by_municipality = []
    for month in months:
        entry = {'month': month}
        for muni in trend_munis:
            entry[muni] = int(monthly_by_muni_df.loc[month, muni]) if month in monthly_by_muni_df.index and muni in monthly_by_muni_df.columns else 0
        monthly_by_municipality.append(entry)

    user_type_split = {'member': member_count, 'casual': casual_count}

    # ══════════════════════════════════════════════════════════════════
    # Monthly breakdowns for period filtering
    # ══════════════════════════════════════════════════════════════════

    # Monthly duration by user type
    md = valid_dur.groupby(['month', 'is_member'])['duration_min'].agg(['sum', 'count']).reset_index()
    monthly_duration = []
    for month in months:
        mem = md[(md['month'] == month) & (md['is_member'] == True)]
        cas = md[(md['month'] == month) & (md['is_member'] == False)]
        monthly_duration.append({
            'month': month,
            'memberDurSum':   float(mem['sum'].iloc[0])   if len(mem) else 0,
            'memberDurCount': int(mem['count'].iloc[0])    if len(mem) else 0,
            'casualDurSum':   float(cas['sum'].iloc[0])    if len(cas) else 0,
            'casualDurCount': int(cas['count'].iloc[0])    if len(cas) else 0,
        })

    # Monthly station count
    start_st = raw[['month', 'start_station_name']].dropna().rename(columns={'start_station_name': 'station'})
    end_st   = raw[['month', 'end_station_name']].dropna().rename(columns={'end_station_name': 'station'})
    all_st   = pd.concat([start_st, end_st])
    monthly_station_count = [{'month': m, 'count': int(all_st[all_st['month'] == m]['station'].nunique())} for m in months]

    # Monthly day of week by user type
    mdow = raw.groupby(['month', 'dow_js', 'is_member']).size().reset_index(name='cnt')
    monthly_day_of_week = []
    for month in months:
        for di in DOW_ORDER:
            mem = mdow[(mdow['month'] == month) & (mdow['dow_js'] == di) & (mdow['is_member'] == True)]
            cas = mdow[(mdow['month'] == month) & (mdow['dow_js'] == di) & (mdow['is_member'] == False)]
            monthly_day_of_week.append({
                'month': month, 'day': DAY_NAMES[di],
                'member': int(mem['cnt'].iloc[0]) if len(mem) else 0,
                'casual': int(cas['cnt'].iloc[0]) if len(cas) else 0,
            })

    # Monthly hourly by day
    mhbd = raw.groupby(['month', 'dow_js', 'hour']).size().reset_index(name='trips')
    monthly_hourly = []
    for month in months:
        sub = mhbd[mhbd['month'] == month]
        for d in range(7):
            for h in range(24):
                row = sub[(sub['dow_js'] == d) & (sub['hour'] == h)]
                monthly_hourly.append({
                    'month': month, 'day': DAY_NAMES[d], 'hour': h,
                    'trips': int(row['trips'].iloc[0]) if len(row) else 0,
                })

    # Monthly top stations (global top 30)
    mst_dep = raw.dropna(subset=['start_station_name']).groupby(['month', 'start_station_name']).size().reset_index(name='dep')
    mst_arr = raw.dropna(subset=['end_station_name']).groupby(['month', 'end_station_name']).size().reset_index(name='arr')
    monthly_top_stations = []
    for month in months:
        dep_m = mst_dep[mst_dep['month'] == month].set_index('start_station_name')['dep']
        arr_m = mst_arr[mst_arr['month'] == month].set_index('end_station_name')['arr']
        for name in top30_names:
            d = int(dep_m.get(name, 0))
            a = int(arr_m.get(name, 0))
            monthly_top_stations.append({'month': month, 'name': name, 'trips': d + a})

    # Monthly station flow (global top 20)
    flow_names = [s['name'] for s in station_flow]
    monthly_station_flow = []
    for month in months:
        dep_m = mst_dep[mst_dep['month'] == month].set_index('start_station_name')['dep']
        arr_m = mst_arr[mst_arr['month'] == month].set_index('end_station_name')['arr']
        for name in flow_names:
            d = int(dep_m.get(name, 0))
            a = int(arr_m.get(name, 0))
            monthly_station_flow.append({'month': month, 'name': name, 'departures': d, 'arrivals': a, 'net': a - d})

    # Monthly duration distribution
    mdd = valid_dur.groupby(['month', 'bucket']).size().reset_index(name='count')
    monthly_dur_dist = []
    for month in months:
        sub = mdd[mdd['month'] == month]
        for label, _ in DURATION_BUCKETS:
            row = sub[sub['bucket'] == label]
            monthly_dur_dist.append({'month': month, 'bucket': label, 'count': int(row['count'].iloc[0]) if len(row) else 0})

    # Monthly municipality (all)
    all_munis = [m['municipality'] for m in municipality_trips]
    mmuni = has_start.groupby(['month', 'municipality', 'is_member']).size().reset_index(name='cnt')
    monthly_muni_all = []
    for month in months:
        sub = mmuni[mmuni['month'] == month]
        for muni in all_munis:
            mem = sub[(sub['municipality'] == muni) & (sub['is_member'] == True)]
            cas = sub[(sub['municipality'] == muni) & (sub['is_member'] == False)]
            m_cnt = int(mem['cnt'].iloc[0]) if len(mem) else 0
            c_cnt = int(cas['cnt'].iloc[0]) if len(cas) else 0
            monthly_muni_all.append({'month': month, 'municipality': muni, 'trips': m_cnt + c_cnt, 'member': m_cnt, 'casual': c_cnt})

    # ── Write output ──────────────────────────────────────────────────
    output = {
        'kpis': kpis,
        'monthlyTrips': monthly_trips,
        'dayOfWeek': day_of_week,
        'hourlyByDay': hourly_by_day,
        'topStations': top_stations,
        'stationFlow': station_flow,
        'durationDistribution': duration_distribution,
        'municipalityTrips': municipality_trips,
        'userTypeSplit': user_type_split,
        'monthlyByMunicipality': monthly_by_municipality,
        'trendMunicipalities': {'top3': top3_munis, 'bottom3': bot3_munis},
        # Monthly breakdowns for filtering
        'monthlyDuration': monthly_duration,
        'monthlyStationCount': monthly_station_count,
        'monthlyDayOfWeek': monthly_day_of_week,
        'monthlyHourlyByDay': monthly_hourly,
        'monthlyTopStations': monthly_top_stations,
        'monthlyStationFlow': monthly_station_flow,
        'monthlyDurationDist': monthly_dur_dist,
        'monthlyMunicipalityAll': monthly_muni_all,
    }

    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    with open(OUT_FILE, 'w') as f:
        json.dump(output, f, indent=2)

    print(f'\nDone! Output: {OUT_FILE}')
    print(f'Total trips: {total_trips:,}')
    print(f'Active stations: {kpis["activeStations"]}')
    print(f'Avg duration: {kpis["avgDurationMin"]} min')
    print(f'Member %: {kpis["memberPct"]}%')
    print(f'Municipalities: {", ".join(m["municipality"] for m in municipality_trips)}')


if __name__ == '__main__':
    main()
