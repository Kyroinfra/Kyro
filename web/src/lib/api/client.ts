import { PUBLIC_API_URL } from '$env/static/public';

export class ApiError extends Error {
	constructor(public status: number, message: string) {
		super(message);
		this.name = 'ApiError';
	}
}

type RequestOptions = {
	method?: string;
	body?: unknown;
	token?: string;
	apiKey?: string;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const { method = 'GET', body, token, apiKey } = options;

	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	};

	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}
	if (apiKey) {
		headers['X-API-Key'] = apiKey;
	}

	const res = await fetch(`${PUBLIC_API_URL}${path}`, {
		method,
		headers,
		body: body ? JSON.stringify(body) : undefined
	});

	if (!res.ok) {
		const error = await res.json().catch(() => ({ error: res.statusText }));
		throw new ApiError(res.status, error.error ?? 'Request failed');
	}

	return res.json();
}
