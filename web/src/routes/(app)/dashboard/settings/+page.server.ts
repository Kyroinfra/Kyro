import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getOrg, getMembers, inviteMember, removeMember, type Org, type Member } from '$lib/api/org';

export const load: PageServerLoad = async ({ locals }) => {
	const token = locals.user?.token;
	if (!token) {
		throw redirect(302, '/login');
	}

	try {
		const [org, members] = await Promise.all([getOrg(token), getMembers(token)]);

		return {
			org: {
				id: org.id,
				name: org.name,
				slug: org.slug,
				plan: org.plan,
				createdAt: org.createdAt
			},
			members: members.map(m => ({
				id: m.id,
				email: m.email,
				role: m.role,
				createdAt: m.createdAt
			}))
		};
	} catch (error) {
		console.error('Failed to load settings:', error);
		return { org: null, members: [] };
	}
};

export const actions: Actions = {
	invite: async ({ request, locals }) => {
		const token = locals.user?.token;
		if (!token) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		const role = formData.get('role') as string;

		if (!email || !password || !role) {
			return fail(400, { error: 'All fields are required' });
		}

		try {
			await inviteMember(token, {
				email,
				password,
				role: role as 'admin' | 'member'
			});
			return { success: true };
		} catch (error: any) {
			console.error('Failed to invite member:', error);
			return fail(500, { error: error.message || 'Failed to invite member' });
		}
	},

	remove: async ({ request, locals }) => {
		const token = locals.user?.token;
		if (!token) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { error: 'Member ID is required' });
		}

		try {
			await removeMember(token, id);
			return { success: true };
		} catch (error: any) {
			console.error('Failed to remove member:', error);
			return fail(500, { error: error.message || 'Failed to remove member' });
		}
	}
};