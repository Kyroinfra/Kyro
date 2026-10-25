import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getKeys } from '$lib/api/keys';

// Same key-presence guard as the ask page: the page talks to the search API
// with the browser-held key until #42 removes it.
export const load: PageServerLoad = async ({ locals }) => {
	const token = locals.user?.token;
	if (!token) {
		throw redirect(302, '/login');
	}

	try {
		const keys = await getKeys(token, 100, 0);
		const activeKeys = keys.filter(k => !k.revoked_at);

		return { hasApiKey: activeKeys.length > 0 };
	} catch (error) {
		console.error('Failed to load search page:', error);
		return { hasApiKey: false };
	}
};
