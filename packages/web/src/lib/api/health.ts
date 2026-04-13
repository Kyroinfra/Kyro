import { request, ApiError } from './client';

export interface HealthResponse {
	status: 'ok' | 'degraded';
	uptime: number;
	test: string;
	timestamp: string;
	database: 'connected' | 'disconnected';
	redis: 'connected' | 'disconnected';
}

export async function getHealth(): Promise<HealthResponse> {
	return request<HealthResponse>('/health');
}

export async function checkHealth(): Promise<{ ok: boolean; error?: string }> {
	try {
		await getHealth();
		return { ok: true };
	} catch (err) {
		const error = err instanceof ApiError ? err.message : 'Failed to connect';
		return { ok: false, error };
	}
}
