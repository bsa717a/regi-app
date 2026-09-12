# Selectable motorcycle / radio plate designs

Follow-up to #69. Motorcycle Life Elevated, motorcycle specialty, and radio
were still “examples only” multi-preview radios. They are now individually
selectable catalog cards, same pattern as special-group designs.

The production `/garage/plates` route is auth-gated, so these were captured
from the Vite harness that mounts the real `UtahPersonalizedPlateFlow` and
serves `public/plates/utah/` catalog art.

Regenerate:

```bash
npm run capture:plates-evidence
```

| File | What it shows |
| --- | --- |
| `type_step_all_selectable_cards.png` | Full type step after the catalog split |
| `motorcycle_life_elevated_arches_selected.png` | Motorcycle Arches selected as its own card |
| `motorcycle_life_elevated_skier_selected.png` | Motorcycle Skier selected |
| `motorcycle_in_god_we_trust_selected.png` | Motorcycle IGWT selected |
| `motorcycle_wildlife_elk_selected.png` | Motorcycle Wildlife Elk selected |
| `radio_amateur_selected.png` | Amateur Radio selected |
| `radio_search_rescue_selected.png` | Search & Rescue selected |
| `motorcycle_skier_combos_5_character_limit.png` | Later step carries motorcycle Skier and the 5-character limit |
| `motorcycle_skier_mvp_copy_design_id.png` | MVP copy includes motorcycle Skier design id |
| `motorcycle_igwt_combos_4_character_limit.png` | Motorcycle IGWT later step, 4-character limit |
| `motorcycle_igwt_fees_special_group.png` | Motorcycle specialty still shows the special-group contribution note |
| `motorcycle_igwt_mvp_copy_design_id.png` | MVP copy includes motorcycle IGWT design id |
| `radio_amateur_combos_6_character_limit.png` | Amateur Radio later step, 6-character limit |
| `radio_amateur_mvp_copy_design_id.png` | MVP copy includes Amateur Radio design id |
