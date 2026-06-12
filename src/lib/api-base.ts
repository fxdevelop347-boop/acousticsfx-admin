/**
 * Backend API base URL for the admin app.
 *
 * - Override with **VITE_API_URL** in `.env.local` when needed.
 * - **Local dev** (`yarn dev`): defaults to `http://localhost:8080`.
 * - **Production build** (deployed): defaults to `https://skyblue-parrot-526216.hostingersite.com`.
 */
export function getApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:8080';
  }
  return 'https://skyblue-parrot-526216.hostingersite.com';
}
