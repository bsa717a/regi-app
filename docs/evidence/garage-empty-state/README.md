# Garage empty-state illustration evidence

Screenshots of `GarageEmptyState` (first-run garage, no vehicles) with
photoreal empty-bay **WebP** art (not SVG). `/garage` is auth-gated, so these
were captured from the Vite harness that mounts the same component.

Regenerate:

```bash
npm run capture:garage-empty-evidence
```

What this evidence is meant to show:

- Raster empty-garage illustration (`/images/garage/empty-bay-{light,dark}.webp`)
- Heading **Add your first registration**
- Primary CTA **Add a registration** (`data-testid="add-first-registration-button"`)
- Light and dark treatments (separate WebP per theme)
- Mobile + desktop widths

Staging walk (after this branch is deployed to `regi-staging`): sign in as
`demo.applicant+staging@regireg.com` and open Garage. The demo applicant may
already have vehicles — if so the empty state will not appear on staging.
Use this harness, or a walk account with zero registrations.

| File | What it shows |
| --- | --- |
| `empty_garage_light.png` | Full first-run empty state, light theme |
| `empty_garage_illustration_light.png` | Empty-bay WebP crop, light |
| `empty_garage_cta_light.png` | Add a registration CTA |
| `empty_garage_dark.png` | Full first-run empty state, dark theme |
| `empty_garage_illustration_dark.png` | Empty-bay WebP crop, dark |
| `empty_garage_light_mobile.png` | Phone-width light empty state |
| `empty_garage_light_desktop.png` | Desktop-width light empty state |
