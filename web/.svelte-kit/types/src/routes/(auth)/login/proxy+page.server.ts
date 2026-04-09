// @ts-nocheck
import { fail, redirect, type Redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { login } from '$lib/api/auth';
import { ApiError } from '$lib/api/client';

const COOKIE_NAME = 'kyro_token';

export const actions = {
	default: async ({ request, cookies }: import('./$types').RequestEvent) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		if (!email || !password) {
			return fail(400, { error: 'Email and password are required' });
		}

		try {
			const response = await login({ email, password });

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
				if (err.status === 401) {
					return fail(401, { error: 'Invalid email or password' });
				}
				return fail(err.status, { error: err.message });
			}
			if (err instanceof Response) {
				const data = await err.json().catch(() => ({ error: 'Login failed' }));
				return fail(err.status, { error: data.error || 'Login failed' });
			}
			console.error('Login error:', err);
			return fail(500, { error: 'An unexpected error occurred' });
		}
	}
};
;null as any as Actions;