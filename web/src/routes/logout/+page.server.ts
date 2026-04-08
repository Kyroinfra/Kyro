import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

const COOKIE_NAME = 'kyro_token';

export const actions = {
	default: async ({ cookies }) => {
		cookies.delete(COOKIE_NAME, { path: '/' });
		throw redirect(302, '/login');
	}
} satisfies Actions;
