# Special-group design selection evidence

Screenshots of the real `UtahPersonalizedPlateFlow` after making special-group
designs individually selectable. The production `/garage/plates` route is
auth-gated, so these were captured from the Vite harness that mounts the same
component and serves `public/plates/utah/` catalog art.

Regenerate:

```bash
npm run capture:plates-evidence
```

| File | What it shows |
| --- | --- |
| `before_special_group_bucket.png` | Before: one Special group bucket with static Elk / Jazz / Historic B&W examples (from #65) |
| `special_group_cards_before_selection.png` | After: three separate special-group cards before one is picked |
| `special_group_wildlife_elk_selected.png` | Wildlife Elk selected |
| `special_group_utah_jazz_selected.png` | Utah Jazz selected |
| `special_group_historic_bw_selected.png` | Historic B&W selected |
| `historic_bw_combos_7_character_limit.png` | Later step carries Historic B&W and the 7-character limit |
| `historic_bw_fees_special_group.png` | Special-group contribution note still applies |
| `historic_bw_mvp_copy_design_id.png` | MVP copy card includes design name and id |
