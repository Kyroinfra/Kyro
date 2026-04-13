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

export interface PaginatedKeys {
	data: ApiKey[];
	pagination: {
		total: number;
		limit: number;
		offset: number;
		hasMore: boolean;
	};
}

export async function getKeys(token: string, limit = 50, offset = 0): Promise<ApiKey[]> {
	const res = await request<PaginatedKeys>(
		`/api/v1/keys?limit=${limit}&offset=${offset}`,
		{ method: 'GET', token }
	);
	return res.data;
}

export async function getAllKeys(token: string): Promise<ApiKey[]> {
	const all: ApiKey[] = [];
	let offset = 0;
	const limit = 100;

	while (true) {
		const res = await request<PaginatedKeys>(
			`/api/v1/keys?limit=${limit}&offset=${offset}`,
			{ method: 'GET', token }
		);
		all.push(...res.data);
		if (!res.pagination.hasMore) break;
		offset += limit;
	}

	return all;
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
