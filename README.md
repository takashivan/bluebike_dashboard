# Bluebikes Dashboard

An interactive data visualization dashboard analyzing 4.6 million Bluebikes trips across Greater Boston's 12-municipality service area (January–December 2025).

**Live Dashboard:** [takashivan.github.io/bluebike_dashboard](https://takashivan.github.io/bluebike_dashboard/)

## User Stories

1. **Marketing Manager** — *As a Bluebikes marketing manager, I want to see how ridership changes month to month and when casual rider usage peaks, so I can time our membership promotions to convert the most casual riders into annual members.*

2. **Bluebikes Rider** — *As a Bluebikes rider, I want to see which times of day are busiest and which stations are the most popular, so I can plan my rides to avoid crowds and find available bikes more easily.*

## Dashboard Tabs

| Tab | Purpose |
|-----|---------|
| **System Overview** | KPIs, monthly ridership trends, user type split, day-of-week patterns, top stations |
| **Station Operations** | Hourly heatmap, station net flow (rebalancing needs), trip duration distribution |
| **Equity & Access** | Municipality ridership comparison, member/casual breakdown, top-3 vs bottom-3 trend analysis |
| **About** | Problem statement, personas, design notes |

All charts respond to **period** and **user type** filters — KPIs, charts, and insights update dynamically.

## Data Pipeline

```
Bluebikes System Data (CSV)  →  prepare_data.py (pandas)  →  bluebikes-2025.json  →  React Dashboard
```

| Step | Tool | Automated? |
|------|------|------------|
| Download monthly CSV files | Manual from [bluebikes.com/system-data](https://bluebikes.com/system-data) | Manual (published monthly) |
| Aggregate 4.6M rows into JSON | `python scripts/prepare_data.py` | Automated |
| Build & deploy dashboard | GitHub Actions → GitHub Pages | Automated on `git push` |

## Project Structure

```
├── scripts/
│   ├── prepare_data.py       # Python/pandas data pipeline (primary)
│   └── prepare-data.js       # Node.js equivalent pipeline
├── public/data/
│   └── bluebikes-2025.json   # Pre-aggregated dashboard data (329 KB)
├── src/
│   ├── App.jsx               # Main app, filter state, tab routing
│   ├── components/           # Reusable UI components
│   │   ├── ChartCard.jsx     # Card wrapper for charts
│   │   ├── FilterBar.jsx     # Period & user type filters
│   │   ├── Heatmap.jsx       # D3-based hour×day heatmap
│   │   └── KpiCard.jsx       # Metric card with context detail
│   └── tabs/                 # Tab content
│       ├── SystemOverview.jsx
│       ├── StationOperations.jsx
│       ├── EquityAccess.jsx
│       └── About.jsx
├── .github/workflows/
│   └── deploy.yml            # GitHub Pages CI/CD
└── BluebikeData_2025/        # Source CSVs (gitignored)
```

## Tech Stack

- **Frontend:** React 19, Recharts, D3.js, Tailwind CSS 4
- **Data Processing:** Python (pandas) / Node.js (csv-parse)
- **Build:** Vite 7
- **Deployment:** GitHub Pages via GitHub Actions

## Getting Started

```bash
# Install dependencies
npm install
pip install pandas

# Process data (either command produces the same output)
python scripts/prepare_data.py
# or: node scripts/prepare-data.js

# Run dev server
npm run dev
```

## Data Source

[Bluebikes System Data](https://bluebikes.com/system-data) — January through December 2025 trip data, 4,613,941 trips across 622 stations in 12 municipalities.

## Team

- **Takashi Ban**
- **Tae Jun Cha**
