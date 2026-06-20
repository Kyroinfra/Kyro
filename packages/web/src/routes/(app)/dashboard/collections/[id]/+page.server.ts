import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getKeys } from '$lib/api/keys';

export const load: PageServerLoad = async ({ locals, params }) => {
	const token = locals.user?.token;
	if (!token) {
		throw redirect(302, '/login');
	}

	try {
		const keys = await getKeys(token, 100, 0);
		const activeKeys = keys.filter(k => !k.revoked_at);

		return {
			hasApiKey: activeKeys.length > 0,
			collectionId: params.id
		};
	} catch (error) {
		console.error('Failed to load collection page:', error);
		return { hasApiKey: false, collectionId: params.id };
	}
};
