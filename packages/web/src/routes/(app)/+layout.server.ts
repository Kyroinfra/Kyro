import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { request } from '$lib/api/client';
import type { MeResponse } from '$lib/api/auth';

// #43: the JWT carries only ids/role, so the sidebar email is fetched fresh
// from /auth/me on every full load — an SSR call (server → INTERNAL_API_URL;
// the browser never sees an absolute API URL). The dashboard itself is
// session-gated by the layout below, so this serves the real email to the
// user chip instead of the hard-coded empty string it used to be.
export const load = (async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	try {
		const me = await request<MeResponse>('/api/v1/auth/me', {
			token: locals.user.token
		});
		return { user: { ...locals.user, email: me.email } };
	} catch {
		// /auth/me unavailable → degrade to the id-only payload; the chip
		// falls back to its placeholder rather than failing the dashboard.
		return { user: { ...locals.user, email: '' } };
	}
}) satisfies LayoutServerLoad;
