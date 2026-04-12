import { request } from './client';

export interface ApiKey {
	id: string;
	name: string;
	key_prefix: string;
	scopes: string[];
	last_used_at: string | null;
	revoked_at: string | null;
	created_at: string;
}

export interface CreateKeyResponse extends ApiKey {
	key: string;
}

export async function getKeys(token: string): Promise<ApiKey[]> {
	return request<ApiKey[]>('/api/v1/keys', { method: 'GET', token });
}

export async function createKey(token: string, name: string, scopes: string[]): Promise<CreateKeyResponse> {
	return request<CreateKeyResponse>('/api/v1/keys', {
		method: 'POST',
		token,
		body: { name, scopes }
	});
}

export async function deleteKey(token: string, id: string): Promise<{ message: string; id: string }> {
	return request<{ message: string; id: string }>(`/api/v1/keys/${id}`, {
		method: 'DELETE',
		token
	});
}
