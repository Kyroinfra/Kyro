import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUsage, getDailyUsage } from '$lib/api/usage';

export const load: PageServerLoad = async ({ locals, url }) => {
	const token = locals.user?.token;
	if (!token) {
		throw redirect(302, '/login');
	}

	// Read range from query param, default to 30
	const rangeParam = url.searchParams.get('range');
	const range = rangeParam === '7' || rangeParam === '90' ? rangeParam : '30';
	const days = parseInt(range, 10);

	// Compute date window
	const endDate = new Date();
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - days);

	const startStr = startDate.toISOString().split('T')[0];
	const endStr = endDate.toISOString().split('T')[0];

	try {
		const [stats, dailyData] = await Promise.all([
			getUsage(token),
			getDailyUsage(token, startStr, endStr)
		]);

		return {
			range,
			stats: {
				totalRequests: stats.total_requests,
				totalBytesIn: stats.total_bytes_in,
				totalBytesOut: stats.total_bytes_out,
				totalStorage: stats.total_storage,
				activeApiKeys: stats.active_api_keys
			},
			daily: dailyData.map(d => ({
				date: d.date,
				requests: d.requests,
				bytesIn: d.bytes_in,
				bytesOut: d.bytes_out
			}))
		};
	} catch (error) {
		console.error('Failed to load usage:', error);
		return {
			range,
			stats: {
				totalRequests: 0,
				totalBytesIn: 0,
				totalBytesOut: 0,
				totalStorage: 0,
				activeApiKeys: 0
			},
			daily: []
		};
	}
};
