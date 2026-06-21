import { request } from './client';
import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';

function getBaseUrl(): string {
	if (browser) {
		return env.PUBLIC_API_URL || '';
	}
	return process.env.INTERNAL_API_URL || 'http://api:3000';
}

export interface FileItem {
	id: string;
	name: string;
	mimeType: string;
	sizeBytes: number;
	createdAt: string;
}

export interface UploadResponse {
	id: string;
	name: string;
	mimeType: string;
	sizeBytes: number;
	createdAt: string;
}

export interface PaginatedFiles {
	data: FileItem[];
	pagination: {
		limit: number;
		hasMore: boolean;
		nextCursor: string | null;
	};
}

export async function getFiles(
	apiKey: string,
	limit = 100,
	cursor?: string
): Promise<{ files: FileItem[]; nextCursor: string | null; hasMore: boolean }> {
	let url = `/api/v1/files?limit=${limit}`;
	if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;

	const res = await request<PaginatedFiles>(url, { method: 'GET', apiKey });

	return {
		files: res.data,
		nextCursor: res.pagination.nextCursor,
		hasMore: res.pagination.hasMore
	};
}

export async function getAllFiles(apiKey: string): Promise<FileItem[]> {
	const all: FileItem[] = [];
	let cursor: string | undefined;

	while (true) {
		const { files, nextCursor, hasMore } = await getFiles(apiKey, 100, cursor);
		all.push(...files);
		if (!hasMore || !nextCursor) break;
		cursor = nextCursor;
	}

	return all;
}

export async function deleteFile(apiKey: string, id: string): Promise<{ message: string; id: string }> {
	return request<{ message: string; id: string }>(`/api/v1/files/${id}`, {
		method: 'DELETE',
		apiKey
	});
}


export async function uploadFile(
	apiKey: string,
	file: File,
	onProgress: (pct: number) => void
): Promise<UploadResponse> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();

		xhr.upload.onprogress = (e) => {
			if (e.lengthComputable) {
				onProgress((e.loaded / e.total) * 100);
			}
		};

		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 400) {
				const data = JSON.parse(xhr.responseText);
				resolve({
					id: data.id,
					name: data.name,
					mimeType: data.mimeType,
					sizeBytes: data.sizeBytes,
					createdAt: data.createdAt
				});
			} else {
				try {
					const error = JSON.parse(xhr.responseText);
					reject(new Error(error.error || 'Upload failed'));
				} catch {
					reject(new Error('Upload failed'));
				}
			}
		};

		xhr.onerror = () => reject(new Error('Network error'));

		xhr.open('POST', `${getBaseUrl()}/api/v2/files`);
		xhr.setRequestHeader('X-API-Key', apiKey);

		const fd = new FormData();
		fd.append('file', file);
		xhr.send(fd);
	});
}

// Returns a SvelteKit proxy URL — the key goes in the query string
// and the server-side handler forwards it as the X-API-Key header.
// Path: /api/files/[id]?key=<apiKey>  (note: NOT /api/v1/files)
export function getDownloadUrl(id: string, apiKey: string): string {
	return `/api/files/${id}?key=${encodeURIComponent(apiKey)}`;
}
