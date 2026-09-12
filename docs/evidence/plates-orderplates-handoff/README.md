# Order Plates end-screen handoff evidence

Screenshots of the real `UtahPersonalizedPlateFlow` MVP end screen after the
Order Plates handoff change. The production `/garage/plates` route is
auth-gated, so these were captured from the Vite harness that mounts the same
component.

Regenerate:

```bash
npm run capture:plates-evidence
```

Handoff facts this evidence is meant to show:

- Primary CTA is `https://mvp.tax.utah.gov/?Link=OrderPlates` (order
  instructions: VIN last-4, payment method, reCAPTCHA) — not the MVP homepage.
- Optional status link: `https://mvp.tax.utah.gov/?link=WhereIsYourPlate`.
- No combo/design query params and no `ChangePlate` deep link.
- Sticky **Your order packet** stays on the end screen with design, choices,
  meaning, fee estimate, and copy buttons.
- Numbered **Get to payment** checklist. Copy does not claim REGI prefills MVP
  or skips payment.

| File | What it shows |
| --- | --- |
| `end_screen_packet_and_checklist.png` | Full Historic B&W end screen: packet + checklist + Order Plates |
| `order_packet_sticky.png` | Sticky **Your order packet** card |
| `get_to_payment_checklist.png` | Numbered Get to payment steps and Order Plates CTA |
| `standard_packet_three_combos.png` | Standard design packet with three combinations |
