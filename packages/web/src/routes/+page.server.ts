import { redirect } from '@sveltejs/kit';

export const load = async ({ locals, fetch }: { locals: App.Locals; fetch: typeof globalThis.fetch }) => {
	if (locals.user) {
		throw redirect(302, '/dashboard');
	}

	try {
		const res = await fetch('/api/org-exists');
		const data = await res.json();
		if (data.exists) {
			throw redirect(302, '/login');
		}
	} catch (err: any) {
		// rethrow SvelteKit redirects, swallow everything else
		if (err?.status === 302 || err?.location) throw err;
		// fetch failed or parse failed — allow registration to proceed
	}
};
