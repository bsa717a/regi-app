/**
 * Resolve the public app origin for invite links.
 * Prefer NEXT_PUBLIC_APP_URL. Never trust the Origin header (spoofable).
 * Fall back only to Host for local/dev when the env var is unset.
 */
export function resolveAppOrigin(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const host = request.headers.get("host")?.trim();
  if (host && (host.includes("localhost") || host.startsWith("127."))) {
    return `http://${host}`.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}
