import { browser } from '$app/environment';

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

function getBaseUrl(): string {
	if (browser) {
		return ''; // browser uses relative URLs, nginx routes them
	}
	// Server-side: use internal Docker network URL
	return process.env.INTERNAL_API_URL || 'http://api:3000';
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const { method = 'GET', body, token, apiKey } = options;

	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	};

	if (token) headers['Authorization'] = `Bearer ${token}`;
	if (apiKey) headers['X-API-Key'] = apiKey;

	const isFormData = body instanceof FormData;
	if (isFormData) {
		delete headers['Content-Type'];
	}

	const url = `${getBaseUrl()}${path}`;

	const res = await fetch(url, {
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
