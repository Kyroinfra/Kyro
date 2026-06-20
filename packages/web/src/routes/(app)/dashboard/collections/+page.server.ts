import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getKeys } from '$lib/api/keys';

export const load: PageServerLoad = async ({ locals }) => {
	const token = locals.user?.token;
	if (!token) {
		throw redirect(302, '/login');
	}

	try {
		const keys = await getKeys(token, 100, 0);
		const activeKeys = keys.filter(k => !k.revoked_at);

		if (activeKeys.length === 0) {
			return { hasApiKey: false };
		}

		return { hasApiKey: true };
	} catch (error) {
		console.error('Failed to load collections page:', error);
		return { hasApiKey: false };
	}
};
