# Renewal history / receipts evidence

Screenshots of the user-facing history list and Sticker Mailed confirmation
(proof) view. Production routes (`/garage/[id]/renewals` and
`/renewals/[id]/receipt`) are auth-gated, so these were captured from the Vite
harness that mounts the same components with a fixture renewal.

Regenerate:

```bash
npm run capture:renewal-history-evidence
```

Facts this evidence is meant to show:

- After **Sticker Mailed**, the user can open a confirmation / proof view.
- History lists past and in-progress renewals; only terminal success gets
  **View confirmation**.
- Proof uses existing concierge data (confirmation id, mailed date, status
  history, uploaded PDF if present, fee **estimate**).
- Copy does **not** invent a payment receipt or Stripe charge.

| File | What it shows |
| --- | --- |
| `history_and_receipt_full.png` | Full harness: history list + confirmation |
| `renewal_history_list.png` | History rows — proof ready vs in progress |
| `sticker_mailed_receipt.png` | Confirmation, history, fee estimate, download |
| `confirmation_facts.png` | Confirmation number, plate, sticker mailed date |
