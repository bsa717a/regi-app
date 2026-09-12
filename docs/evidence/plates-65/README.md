# PR #65 plate-type preview evidence

Screenshots of the real `UtahPersonalizedPlateFlow` type step (not a mock).
The production `/garage/plates` route is auth-gated, so these were captured
from a Vite harness that mounts the same component and serves
`public/plates/utah/` catalog art.

Regenerate:

```bash
npm run capture:plates-evidence
```

| File | What it shows |
| --- | --- |
| `type_step_arches_preview.png` | Life Elevated Arches card (default selected) |
| `type_step_skier_preview.png` | Life Elevated Skier card |
| `type_step_specialty_igwt_selected.png` | In God We Trust after click |
| `type_step_specialty_special_group.png` | Pre-fix Special group bucket (Elk, Jazz, Historic B&W as static examples). Selectable cards: `docs/evidence/plates-special-group/` |
| `type_step_full_arches_skier_specialty.png` | Full type-step scroll (mobile width) |
