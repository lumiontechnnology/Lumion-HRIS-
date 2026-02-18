## Goal
Apply an Apple-style glassmorphism UI to `user-dashboard.html` using translucent cards, soft shadows, blur, and vibrant accents, aligned with the provided mock images and consistent with the Employees page refresh.

## Visual System
- Glass Cards: `backdrop-filter: blur(12px) saturate(140%)`, semi-translucent white/indigo with subtle borders (`rgba(255,255,255,.25)`), rounded 16px.
- Accents: gentle gradients (indigo/blue/purple), color-coded KPI deltas (green/yellow/red), and vibrant quick action buttons.
- Typography: system font stack already used; keep weights 600/700 for titles, 500 for badges.
- Elevation: soft outer shadows and inner divider lines for hierarchy; hover states with slight lift.

## Layout
- Sidebar: compact icons & labels (Dashboard, My Profile, Employees, Attendance, Leave Management, Payroll, Performance, Documents), active item with pill highlight.
- Top Bar: centered search input (glass input), right-aligned actions (notifications, help, avatar menu).
- Content: welcome banner, KPI glass cards grid, Quick Actions glass tiles row, followed by existing dashboard sections.

## Components
- Welcome Banner: blue gradient glass panel with greeting (`Store.currentUser().name`) and short pulse status.
- KPI Cards (4–6): Hours This Week, Leave Balance, Performance Score, Completed Tasks, (optional) Attendance Streak.
- Quick Actions: Clock In, Clock Out, Request Leave, Submit Expense, View Payslip, Book Meeting.
- Tooltips: small glass tooltips for KPI details on hover.

## Styling Tokens (Scoped to user-dashboard.html)
- `.glass-card` : core card style with blur, translucent bg, border, radius, shadow.
- `.glass-input` : input/select with translucent background, focus ring.
- `.badge` : KPI deltas.
- `.chip` : small metadata labels.
- `.btn-quick` : vibrant gradient buttons with hover/active states.

## Data Wiring
- Hours This Week: compute from `Store.getAttendance(user.id)` (sum daily durations; fallback if open shifts).
- Leave Balance: derive from `Store.getLeaves(user.id)` vs annual entitlement; show remaining.
- Performance Score: latest `Store.computeAndSaveAppraisalSummary(user.id, period)`.
- Completed Tasks: count attendance records marked complete + approved leaves in current month.
- All KPIs update on relevant actions (clock-in/out, leave submission).

## Implementation Plan
1. Add a wrapper layout in `user-dashboard.html` (sidebar + header + main content).
2. Insert style tokens for glass effects inside `<style>` (no new files).
3. Create KPI grid and Quick Actions block; wire buttons to existing handlers in `js/user-dashboard.js`.
4. Implement small helpers in `js/user-dashboard.js` to compute KPI values and deltas.
5. Ensure responsive behavior (1–2 columns on mobile; 3–4 on desktop), keyboard focus, and hover states.
6. Verify with local static server; ensure no regression to attendance/payslip/leave tabs.

## Optional Enhancements (after baseline)
- Micro animations (Framer Motion-like but implemented via CSS transitions only).
- Theme toggle (light vs dark glass).
- Extract tokens to a shared stylesheet after approval for consistency across pages.

## Acceptance
- Visual parity with mock: glass cards, vibrant quick actions, sticky sidebar, centered search.
- KPIs show correct values and update on actions.
- No backend dependency; works purely with Store/local state.

Approve to proceed with the edits to `user-dashboard.html` and `js/user-dashboard.js`. 