import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { register } from '$lib/api/auth';
import { ApiError } from '$lib/api/client';

const COOKIE_NAME = 'kyro_token';

export const load: PageServerLoad = async ({ locals, fetch }) => {
	if (locals.user) {
		throw redirect(302, '/dashboard');
	}

	try {
		const res = await fetch('/api/org-exists');
		const { exists } = await res.json();
		if (exists) {
			throw redirect(302, '/login');
		}
	} catch (err) {
		if ((err as any)?.status === 302) throw err;
		// if the check fails, allow registration to proceed
	}
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const orgName = formData.get('orgName') as string;
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		if (!orgName || !email || !password) {
			return fail(400, { error: 'All fields are required' });
		}

		if (password.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters' });
		}

		try {
			const response = await register({ orgName, email, password });

			cookies.set(COOKIE_NAME, response.token, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: process.env.NODE_ENV === 'production',
				maxAge: 60 * 60 * 24 * 7
			});

			throw redirect(302, '/dashboard');
		} catch (err) {
			if ((err as any)?.status === 302 || (err as any)?.status === 301) {
				throw err;
			}
			if (err instanceof ApiError) {
				if (err.status === 400 && err.message === 'Invalid input') {
					return fail(400, { error: 'Please check your details — password must be at least 8 characters' });
				}
				return fail(err.status, { error: err.message });
			}
			if (err instanceof Response) {
				const data = await err.json().catch(() => ({ error: 'Registration failed' }));
				return fail(err.status, { error: data.error || 'Registration failed' });
			}
			console.error('Registration error:', err);
			return fail(500, { error: 'An unexpected error occurred' });
		}
	}
};
