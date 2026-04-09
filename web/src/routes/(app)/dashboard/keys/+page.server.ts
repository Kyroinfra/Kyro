import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getKeys, createKey, deleteKey, type ApiKey, type CreateKeyResponse } from '$lib/api/keys';

export const load: PageServerLoad = async ({ locals }) => {
	const token = locals.user?.token;
	if (!token) {
		throw redirect(302, '/login');
	}

	try {
		const keys = await getKeys(token);
		return {
			keys: keys.map((k) => ({
				id: k.id,
				name: k.name,
				prefix: k.key_prefix,
				scopes: k.scopes,
				lastUsedAt: k.last_used_at,
				createdAt: k.created_at
			}))
		};
	} catch (error) {
		console.error('Failed to load keys:', error);
		return { keys: [] };
	}
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const token = locals.user?.token;
		if (!token) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const scopes = formData.getAll('scopes') as string[];

		if (!name || name.trim() === '') {
			return fail(400, { error: 'Name is required' });
		}

		try {
			const result = await createKey(token, name.trim(), scopes.length > 0 ? scopes : ['read']);
			return {
				success: true,
				newKey: result.key
			};
		} catch (error: any) {
			console.error('Failed to create key:', error);
			return fail(500, { error: error.message || 'Failed to create key' });
		}
	},

	delete: async ({ request, locals }) => {
		const token = locals.user?.token;
		if (!token) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { error: 'Key ID is required' });
		}

		try {
			await deleteKey(token, id);
			return { success: true };
		} catch (error: any) {
			console.error('Failed to delete key:', error);
			return fail(500, { error: error.message || 'Failed to delete key' });
		}
	}
};
