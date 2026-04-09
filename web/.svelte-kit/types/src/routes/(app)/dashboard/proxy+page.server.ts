// @ts-nocheck
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUsage } from '$lib/api/usage';
import { getKeys } from '$lib/api/keys';
import { getMembers } from '$lib/api/org';

export const load = async ({ locals }: Parameters<PageServerLoad>[0]) => {
	const token = locals.user?.token;
	if (!token) {
		throw redirect(302, '/login');
	}

	try {
		const [usage, keys, members] = await Promise.all([
			getUsage(token),
			getKeys(token),
			getMembers(token)
		]);

		return {
			stats: {
				totalRequests: usage.total_requests,
				totalStorage: usage.total_storage,
				activeApiKeys: keys.filter(k => !k.revoked_at).length,
				totalMembers: members.length
			}
		};
	} catch (error) {
		console.error('Failed to load dashboard stats:', error);
		return {
			stats: {
				totalRequests: 0,
				totalStorage: 0,
				activeApiKeys: 0,
				totalMembers: 1
			}
		};
	}
};