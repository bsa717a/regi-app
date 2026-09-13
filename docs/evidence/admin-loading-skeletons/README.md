# Admin loading skeleton evidence

Screenshots of the admin **Queue** and **Users** list skeletons. `/admin` is
staff-gated, so these were captured from the Vite harness that mounts the same
`AdminTableSkeleton` + admin chrome used on those tabs.

Regenerate:

```bash
npm run capture:admin-skeleton-evidence
```

What this evidence is meant to show:

- Table-shaped pulse placeholders (UI chrome), not a spinner-only wait
- No decorative SVG illustrations
- Queue filters remain visible while rows load
- Users filter field remains visible while rows load
- Shared `AdminTable` header/border treatment

| File | What it shows |
| --- | --- |
| `admin_queue_skeleton.png` | Queue tab loading skeleton (desktop) |
| `admin_users_skeleton.png` | Users tab loading skeleton (desktop) |
| `admin_queue_skeleton_mobile.png` | Queue tab loading skeleton (phone width) |
| `admin_users_skeleton_mobile.png` | Users tab loading skeleton (phone width) |
