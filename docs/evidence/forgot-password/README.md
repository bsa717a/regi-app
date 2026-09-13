# Forgot-password prominence evidence (PR #75)

Screenshots of the login and reset-password flows after making **Forgot
password?** more visible, adding inline error guidance, and raising
**Email** / **Password** label contrast on the dark garage-door card.

Labels use theme-independent `onDarkLabelClassName` (`text-white`) so they
stay readable whether the app theme is dark or light. The garage-door card
is always dark.

These files are in-repo so Hub can pull them via `raw.githubusercontent.com`
without a GitHub click-through.

| File | What it shows |
| --- | --- |
| `login_dark_readable_labels.png` | Dark theme: white Email/Password labels + prominent **Forgot password?** |
| `login_light_theme_readable_labels.png` | Light app theme: same always-dark card, labels still white |
| `login_forgot_password_prominent_mobile.png` | Login (mobile): **Forgot password?** is easy to find |
| `login_forgot_password_prominent_desktop.png` | Login (desktop): same link, not buried |
| `login_inline_error_with_reset_cta.png` | Wrong-password inline error with a reset CTA |
| `forgot_password_page.png` | Forgot-password / reset request page |
| `staging_login_before_buried_link.png` | Staging before: buried **Forgot password?** (optional) |
