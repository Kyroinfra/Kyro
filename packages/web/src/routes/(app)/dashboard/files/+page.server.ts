import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getKeys } from '$lib/api/keys';
import { getFiles } from '$lib/api/files';

export const load: PageServerLoad = async ({ locals }) => {
	const token = locals.user?.token;
	if (!token) {
		throw redirect(302, '/login');
	}

	try {
		const keys = await getKeys(token, 100, 0);
		const activeKeys = keys.filter(k => !k.revoked_at);

		if (activeKeys.length === 0) {
			return { files: [], hasApiKey: false, apiKeyPrefix: null };
		}

		// We only have the key prefix server-side, not the full key.
		// Return the prefix so the client knows keys exist; the full key
		// must be entered by the user in the browser.
		return {
			files: [],
			hasApiKey: true,
			apiKeyPrefix: activeKeys[0].key_prefix
		};
	} catch (error) {
		console.error('Failed to load files page:', error);
		return { files: [], hasApiKey: false, apiKeyPrefix: null };
	}
};
