# Per-page document titles (Piper `cmtp34m000010s601u23856g9`)

Before this change, most routes inherited the root title **REGI**. Tabs and
OS window chrome could not tell Login from Garage from Admin.

After: each meaningful route sets Next.js `metadata` via `pageMetadata()`,
so the document title is `Page · REGI` (for example `Login · REGI`).

These files are in-repo so Hub can pull them via `raw.githubusercontent.com`
without a GitHub click-through.

| File | What it shows |
| --- | --- |
| `before_login_tab_title.png` | Staging / previous main: tab title is only **REGI** on `/login` |
| `after_login_tab_title.png` | After: tab title **Login · REGI** |
| `after_signup_tab_title.png` | After: **Sign up · REGI** |
| `after_forgot_password_tab_title.png` | After: **Forgot password · REGI** |
| `after_privacy_tab_title.png` | After: **Privacy Policy · REGI** (legal pages already used this form) |
| `after_support_tab_title.png` | After: **Support · REGI** |
| `after_terms_tab_title.png` | After: **Terms of Use · REGI** |
| `after_two_tabs_login_and_privacy.png` | Two tabs at once: **Login · REGI** and **Privacy Policy · REGI** |

Public routes that previously showed only `REGI` on staging (`/login`,
`/signup`, `/forgot-password`) are the before/after pair. Legal pages already
had distinct titles; they now go through the same helper so they cannot
double-suffix when the root `title.template` is `%s · REGI`.
