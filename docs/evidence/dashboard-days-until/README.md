# Dashboard days-until-expiration evidence

Screenshots of the Renewals inbox (`DashboardClient` at `/renewals`, legacy
`/dashboard` redirect) before and after surfacing Garage countdown copy in the
headline.

Production is auth-gated, so these were captured from the Vite harness that
mounts `DashboardRenewalSummary` + `RenewalCard` with fixture registrations.

Regenerate:

```bash
npm run capture:dashboard-days-evidence
```

Facts this evidence is meant to show:

- **Before:** the inbox headline said “Something needs attention soon” or
  “Everything looks current” — no days-until number.
- **After:** the headline uses the same Garage language and status colors
  (`Expires in 14 days`, `Expires in 200 days`, `Expired 12 days ago`).
- Cards already showed `countdown`; after, the summary matches.

| File | What it shows |
| --- | --- |
| `dashboard_before_no_days_in_summary.png` | Before: Due Soon garage, vague “needs attention” |
| `dashboard_after_days_until.png` | After: **Expires in 14 days** in amber |
| `dashboard_before_current_vague.png` | Before: current garage, “Everything looks current” |
| `dashboard_after_current_days.png` | After: **Expires in 200 days** in teal |
| `dashboard_after_expired_days.png` | After: **Expired 12 days ago** in rose |
| `dashboard_after_days_until_dark.png` | After, dark theme |
| `dashboard_after_days_until_desktop.png` | After, desktop width |
