import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// ── Storage config ────────────────────────────────────────────────────────────
// Keys are persisted to localStorage so they survive page reloads.
// They expire after EXPIRY_MS (default: 8 hours). On expiry the stored
// value is silently cleared and the user is prompted to re-enter their key.

const STORAGE_KEY   = 'kyro_api_key';
const EXPIRY_MS     = 8 * 60 * 60 * 1000; // 8 hours

interface StoredKey {
	key:       string;
	prefix:    string;
	expiresAt: number; // Unix ms
}

function readStorage(): StoredKey | null {
	if (!browser) return null;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const stored: StoredKey = JSON.parse(raw);
		if (Date.now() > stored.expiresAt) {
			localStorage.removeItem(STORAGE_KEY);
			return null;
		}
		return stored;
	} catch {
		return null;
	}
}

function writeStorage(key: string, prefix: string) {
	if (!browser) return;
	const payload: StoredKey = {
		key,
		prefix,
		expiresAt: Date.now() + EXPIRY_MS,
	};
	localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function clearStorage() {
	if (!browser) return;
	localStorage.removeItem(STORAGE_KEY);
}

// ── Stores ────────────────────────────────────────────────────────────────────

const stored = readStorage();

export const apiKey        = writable<string>(stored?.key    ?? '');
export const apiKeyVerified = writable<boolean>(!!stored?.key);
export const apiKeyPrefix  = writable<string | null>(stored?.prefix ?? null);

// Persist whenever the key changes (empty string = cleared)
apiKey.subscribe((val) => {
	if (!browser) return;
	if (!val) {
		clearStorage();
	}
	// writeStorage is called explicitly in ApiKeyGate after verification
	// to avoid writing an unverified key to storage.
});

export function persistApiKey(key: string, prefix: string) {
	writeStorage(key, prefix);
}

export function clearApiKey() {
	apiKey.set('');
	apiKeyVerified.set(false);
	apiKeyPrefix.set(null);
	clearStorage();
}

// Expose expiry so the UI can show "expires in X hours"
export function getKeyExpiry(): Date | null {
	const stored = readStorage();
	return stored ? new Date(stored.expiresAt) : null;
}
