import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUsage } from '$lib/api/usage';
import { getKeys } from '$lib/api/keys';
import { getMembers } from '$lib/api/org';
import { getFilesV2 } from '$lib/api/files-v2';

export const load: PageServerLoad = async ({ locals }) => {
	const token = locals.user?.token;
	if (!token) {
		throw redirect(302, '/login');
	}

	try {
		const [usage, keys, members, filesPage] = await Promise.all([
			getUsage(token),
			getKeys(token, 100, 0),
			getMembers(token),
			// We need a read-scope API key to fetch files — we don't have one
			// server-side (only the JWT token). So we pass null and handle gracefully.
			Promise.resolve(null)
		]);

		const activeKeys = keys.filter(k => !k.revoked_at);

		return {
			stats: {
				totalRequests: usage.total_requests,
				totalStorage: usage.total_storage,
				totalBytesIn: usage.total_bytes_in,
				totalBytesOut: usage.total_bytes_out,
				activeApiKeys: activeKeys.length,
				totalMembers: members.length,
				storageLimit: 1073741824 // 1 GB default; shown as context
			},
			recentKeys: keys.slice(0, 4).map(k => ({
				id: k.id,
				name: k.name,
				prefix: k.key_prefix,
				scopes: k.scopes,
				lastUsedAt: k.last_used_at,
				revokedAt: k.revoked_at,
				createdAt: k.created_at
			})),
			members: members.slice(0, 3).map(m => ({
				id: m.id,
				email: m.email,
				role: m.role
			}))
		};
	} catch (error) {
		console.error('Failed to load dashboard stats:', error);
		return {
			stats: {
				totalRequests: 0,
				totalStorage: 0,
				totalBytesIn: 0,
				totalBytesOut: 0,
				activeApiKeys: 0,
				totalMembers: 1,
				storageLimit: 1073741824
			},
			recentKeys: [],
			members: []
		};
	}
};
