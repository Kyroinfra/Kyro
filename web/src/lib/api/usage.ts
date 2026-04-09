import { request } from './client';

export interface UsageStats {
	total_requests: number;
	total_bytes_in: number;
	total_bytes_out: number;
	total_storage: number;
	active_api_keys: number;
}

export interface DailyUsage {
	date: string;
	requests: number;
	bytes_in: number;
	bytes_out: number;
}

export async function getUsage(token: string): Promise<UsageStats> {
	return request<UsageStats>('/api/v1/usage', { method: 'GET', token });
}

export async function getDailyUsage(token: string, startDate?: string, endDate?: string): Promise<DailyUsage[]> {
	let url = '/api/v1/usage/daily';
	const params = new URLSearchParams();
	if (startDate) params.append('start_date', startDate);
	if (endDate) params.append('end_date', endDate);
	if (params.toString()) url += `?${params.toString()}`;

	const data = await request<Array<{
		date: string;
		requests: string;
		bytes_in: string;
		bytes_out: string;
	}>>(url, { method: 'GET', token });

	return data.map(d => ({
		date: d.date,
		requests: parseInt(d.requests, 10),
		bytes_in: parseInt(d.bytes_in, 10),
		bytes_out: parseInt(d.bytes_out, 10)
	}));
}
