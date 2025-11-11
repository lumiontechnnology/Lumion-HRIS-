# Emotional Pulse System (Prototype)

This module implements a predictive employee sentiment engine with:
- Morning check-ins and evening reflections
- Real-time dashboard with charts (Chart.js)
- Burnout risk detection and HR alerts
- LocalStorage persistence with seeded sample data

## Files
- `index.html` — Entry point with Login, Morning, Dashboard, Evening screens
- `style.css` — Responsive styling (grid, mood selectors, heatmap)
- `app.js` — EmotionalPulseSystem: data model, seeding, auth, mood tracking, risk
- `mood-analytics.js` — Charts and insights using Chart.js

## Run
This sits inside your existing project. With the local server running, open:
- `http://localhost:3006/pulse/index.html`

If you prefer opening directly, you can double-click the file, but the local server is recommended for consistent CDN behavior.

## Data Model
- Employee: `{ id, name, department, role }`
- Mood Entry: `{ id, employeeId, session: 'morning'|'evening', mood, intensity (1-5), notes, timestamp }`

## Burnout Risk (Prototype)
Score = weighted combination of average intensity for stress-like moods (`stressed`, `anxious`, `tired`, `sad`) over 14 days, plus frequency of negative daily deltas (evening minus morning intensity < 0). Thresholds:
- 60%+: Elevated risk (shows in insights)
- 75%+: High risk (shows in HR alerts)

## Notes
- No backend; demo-only persistence under `localStorage` key `eps_store_v1` and session key `eps_current_user_id`.
- Seeded sample data covers the last 30 days across 8 demo employees.
- Extend or integrate with your existing HRIS by wiring APIs or central store.