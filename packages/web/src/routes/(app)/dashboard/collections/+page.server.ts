import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Session-only dashboard (#42): data calls authenticate with the kyro_token
// cookie through the same-origin proxy — the page no longer needs to know
// whether any API keys exist.
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user?.token) {
		throw redirect(302, '/login');
	}

	return {};
};
