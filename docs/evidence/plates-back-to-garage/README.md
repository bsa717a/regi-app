# Plates “Back to garage” exit evidence

Screenshots of the real `UtahPersonalizedPlateFlow` Order Plates end screen
after adding a garage exit. The production `/garage/plates` route is
auth-gated, so these were captured from the Vite harness that mounts the same
component.

Regenerate:

```bash
npm run capture:plates-evidence
```

What this evidence is meant to show:

- The MVP / Order Plates handoff packet, Get to payment checklist, and
  Order Plates CTA stay intact.
- A clear **Back to garage** control is visible on the end screen and
  points at `/garage` — not only wizard **Back** (previous step).

| File | What it shows |
| --- | --- |
| `end_screen_handoff_and_garage_exit.png` | Order packet + handoff still intact, wizard **Back** and **Back to garage** |
| `end_screen_back_to_garage.png` | Full Historic B&W end screen including the garage exit |
| `back_to_garage_control.png` | The end-screen **Back to garage** control |
