import { writable } from 'svelte/store';

// In-memory only — never persisted to localStorage/sessionStorage/cookies.
// Lost on full page reload, shared across client-side navigations within
// the dashboard so the user doesn't have to re-paste their API key on
// every page (Files / Collections / Ask all consume this).
export const apiKey = writable<string>('');
export const apiKeyVerified = writable<boolean>(false);
export const apiKeyPrefix = writable<string | null>(null);

export function clearApiKey() {
	apiKey.set('');
	apiKeyVerified.set(false);
	apiKeyPrefix.set(null);
}
