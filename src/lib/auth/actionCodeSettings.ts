import type { ActionCodeSettings } from "firebase-admin/auth";

/**
 * Build ActionCodeSettings for Firebase Auth email action links.
 *
 * After Firebase Dynamic Links was shut down (August 2025), email verification
 * and password reset links may require the `linkDomain` property to be set to
 * a Firebase Hosting domain. Set the FIREBASE_LINK_DOMAIN environment variable
 * to specify the domain (e.g., "example.firebaseapp.com" or "app.example.com").
 *
 * If the environment variable is not set, Firebase uses the project's default
 * hosting domain. This may fail with auth/internal-error if:
 * - Identity Toolkit API is not enabled
 * - Service account lacks firebaseauth.users.get permission
 * - Continue URL domain is not in Firebase Auth authorized domains
 * - Project's email link configuration via mobileLinksConfig is not set up
 */
export function buildActionCodeSettings(continueUrl: string): ActionCodeSettings {
  const settings: ActionCodeSettings = {
    url: continueUrl,
    handleCodeInApp: false,
  };

  const linkDomain = process.env.FIREBASE_LINK_DOMAIN?.trim();
  if (linkDomain) {
    settings.linkDomain = linkDomain;
  }

  return settings;
}
