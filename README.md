# Lumion HRIS (Prototype)

Lumion HRIS is a client-side prototype demonstrating a modern HR system with:
- Employee directory and admin dashboard
- Attendance tracking with office geofencing and remote mode
- Leave management with policy summaries and insights
- Payroll summaries and exports
- Performance and onboarding dashboards
- Lightweight notifications and CSV exports

This repo is static (no backend). Data persists in `localStorage` for demo purposes.

## Quick Start

You can open the HTML files directly in a browser or serve locally with any static server.

Option A — open pages directly:
- Double-click `login.html` and use the credentials below.

Option B — run a local static server (Node.js):
```
npx http-server -p 3006 -c-1
```
Then open:
- `http://localhost:3006/login.html`

## Default Credentials

- Admin: `admin@lumion.com` / `admin123`
- User: `stanford.george@lumion.com` / `user123`
- User: `ada.bello@lumion.com` / `user123`
- User: `chike.okoro@lumion.com` / `user123`

## Key Pages

- `login.html` — sign in as admin or user
- `user-dashboard.html` — user self-service dashboard (attendance, payslip, leaves)
- `leave-attendance.html` — leave requests, attendance table, insights, notifications panel
- `hris-dashboard-admin.html` — admin overview, jobs, candidates, exports
- `payroll-dashboard.html` — payroll summaries and exports
- `performance-dashboard.html` — personal performance dashboard
- `hr-performance.html` — HR performance views (prototype)
- `Onboarding.html` — onboarding flows (prototype)
- `analytics.html` — people analytics (prototype)

## Recruiting — Sourcing

On `Jobs.html`, HR managers can simulate and import candidates into jobs or the Lumion pool:
- Auto-source (simulate): Use the LinkedIn, Indeed, Glassdoor, or Lumion DB buttons. Toggle `Auto-apply` to attach sourced profiles directly to the selected job.
- Import from URL: Paste a LinkedIn/Indeed profile or search URL. The prototype extracts coarse keywords and simulates 2–5 relevant profiles. With `Auto-apply`, candidates are added to the current job; otherwise, they go to the Lumion pool.
- CSV Import: Click `Import Candidates CSV` to upload a CSV.
  - Expected headers: `name,title,company,years,skills,certs,match,status,notes`
  - Multiple values in `skills`/`certs` can be separated by `;` or `,`.

Example CSV:

```
name,title,company,years,skills,certs,match,status,notes
Ada Oke,Frontend Engineer,Flutterwave,4,React;TypeScript;Tailwind,,82,Applied,Portfolio looks strong
John Doe,Data Scientist,Andela,3,Python;ML;Pandas,DataX,77,Interview,Focus on feature engineering
```

Notes
- URL import is a prototype that extracts keywords from the URL for simulation. No external credentials are required.
- CSV import is client-side only; data never leaves the browser in this prototype.

## Engagement & Check-ins

- Daily Check-in: On `user-dashboard.html`, employees record mood (1–5), stress (1–5), workload (1–5), and optional notes. Entries store in `Store.pulses` (localStorage).
- 7-day Engagement: The user dashboard shows the rolling 7-day engagement index.
- Organization Engagement: `analytics.html` aggregates engagement across users and updates the Engagement KPI when pulse data exists.
- Store helpers: See `js/store.js` for `addOrUpdatePulse`, `getPulse`, `getPulses`, and `computeEngagementFromPulses`.

## Attendance — Features

Implemented in `js/user-dashboard.js` (UI wiring) and `js/store.js` (persistence):
- Clock In/Out with two modes:
  - In-office: verifies browser geolocation within office geofence
  - Remote: uses browser session start time as “computer login time”
- Geofence support:
  - Configurable office radius per location
  - Optional beacon coordinates for large sites/floors
- Policy checks and notes:
  - Late detection using configurable work start and grace
  - Out-of-zone detection with fallback to remote
  - Remote fallback when geolocation is unavailable/denied
- History and exports:
  - 30-day history table with status, times, mode, and location
  - CSV export from the History tab
- Auto-close open shifts:
  - Auto-closes previous-day open shifts at cutoff time
  - Marks records with `autoClosed` flag and notifies

### Attendance Configuration

All parameters live in `js/user-dashboard.js` near the top:
- `ATT_OFFICE_SITES` — office definitions, e.g.:
  - `name`, `lat`, `lng`, `radiusM`
  - optional `beacons: [{ lat, lng, radiusM }]`
- `GEOFENCE_RADIUS_M` — default office radius (meters)
- `WORK_START` — official start time, `HH:mm` (e.g., `09:00`)
- `LATE_GRACE_MIN` — minutes of grace before status becomes Late
- `WORK_END` — auto-close cutoff for previous-day open shifts

### Notifications

Backed by the store (`js/store.js`):
- Storage: `notifications: []` in the store state
- Helpers:
  - `Store.addNotification({ type, userId, date, message })`
  - `Store.getNotifications(filter?: { userId?, type? })`
  - `Store.autoCloseOpenShifts(userId, cutoffHHmm)`
- Types used by attendance:
  - `auto_close` — previous-day open shift auto-closed
  - `late` — late clock-in detected
  - `out_zone` — office mode but outside geofence
  - `remote_recorded` — location unavailable/denied; clock-in recorded as remote
- Admin notifications panel:
  - `leave-attendance.html` renders recent notifications from `Store.getNotifications()`

### CSV Exports

- User: `user-dashboard.html` → Attendance → History → Export CSV
  - Exports 30 days: Date, Status, In, Out, Mode, Location, AutoClosed
- Admin: `leave-attendance.html` → top right Export CSV (leave + today’s attendance in one file)
- Additional exports exist in `hris-dashboard-admin.html` and `payroll-dashboard.html`.

## Running and Testing

1) Start a static server or open `login.html` directly.
2) Log in as a user, open Attendance → try both modes:
   - In-office: allow location; if within radius, marked as office; otherwise remote
   - Remote: records session start time as login reference
3) Switch to History, verify rows and CSV export.
4) Optionally clock in on one day and do not clock out; next day load will auto-close and create a notification.
5) As admin, open `leave-attendance.html` and confirm the Notifications panel lists recent items.

## Data Persistence and Reset

This prototype uses `localStorage`:
- Store key: `lumionHR_store_v3`
- Session key: `lumionHR_current_user_id`

To reset seed data:
1) Log out, then open browser devtools → Application/Storage → Local Storage
2) Delete keys above or run from console:
```
localStorage.removeItem('lumionHR_store_v3');
localStorage.removeItem('lumionHR_current_user_id');
```
3) Reload the page(s).

## Project Structure

```
├── index.html
├── login.html
├── user-dashboard.html
├── leave-attendance.html
├── hris-dashboard-admin.html
├── payroll-dashboard.html
├── performance-dashboard.html
├── hr-performance.html
├── analytics.html
├── Onboarding.html
└── js/
    ├── store.js
    ├── user-dashboard.js
    ├── auth.js
    ├── hr-data.js
    ├── hr-performance.js
    ├── performance.js
    └── onboarding.js
```

## Notes and Limitations

- Prototype only; not production-ready. No backend or auth hardening.
- Geolocation requires browser support and permission; otherwise falls back to remote.
- Attendance history uses client time; timezone differences may affect display.

## License

See [LICENSE](./LICENSE).

## Contributing

Issues and PRs are welcome. For larger changes, please open an issue to discuss the approach first.