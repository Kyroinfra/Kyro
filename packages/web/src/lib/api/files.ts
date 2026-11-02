import { request } from './client';

// Same-origin everywhere (#42): the browser reaches the API only through the
// SvelteKit catch-all proxy at /api, which injects the session cookie's JWT —
// callers pass no credentials at all. (SSR loads, e.g. the keys page, use
// client.request() with an explicit session token instead.)

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
	status: FileStatus;
}

// One pipeline status (#33): the file's whole ingest position.
export type FileStatus = 'pending' | 'processing' | 'ready' | 'failed' | 'skipped';

export type FileItemV2 = FileItem & {
	status: FileStatus;
};

export interface PaginatedFilesV2 {
	data: FileItemV2[];
	pagination: {
		limit: number;
		hasMore: boolean;
		nextCursor: string | null;
	};
}

export async function getFilesV2(
	limit = 100,
	cursor?: string
): Promise<{ files: FileItemV2[]; nextCursor: string | null; hasMore: boolean }> {
	let url = `/api/v1/files?limit=${limit}`;
	if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;

	const res = await request<PaginatedFilesV2>(url, { method: 'GET' });

	return {
		files: res.data,
		nextCursor: res.pagination.nextCursor,
		hasMore: res.pagination.hasMore
	};
}

export async function deleteFile(id: string): Promise<{ message: string; id: string }> {
	return request<{ message: string; id: string }>(`/api/v1/files/${id}`, {
		method: 'DELETE'
	});
}

export async function uploadFile(
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
					createdAt: data.createdAt,
					status: data.status
				});
			} else {
				try {
					const error = JSON.parse(xhr.responseText);
					// Error bodies are the unified {error:{message}} shape (#27/#41);
					// some route-level 400s still carry the legacy flat string.
					const message =
						typeof error.error === 'string'
							? error.error
							: error.error?.message;
					reject(new Error(message || 'Upload failed'));
				} catch {
					reject(new Error('Upload failed'));
				}
			}
		};

		xhr.onerror = () => reject(new Error('Network error'));

		// Same-origin POST (#42): the session cookie rides along automatically;
		// the proxy injects it as the Bearer token — no API key header.
		xhr.open('POST', '/api/v1/files');

		const fd = new FormData();
		fd.append('file', file);
		xhr.send(fd);
	});
}

// Same-origin download (#42): the API answers GET /files/:id with an
// attachment stream; the catch-all proxy injects the session Bearer.
export function getDownloadUrl(id: string): string {
	return `/api/v1/files/${id}`;
}

export interface ExtractedTextResponse {
	fileId: string;
	status: FileStatus;
	extractedText: string | null;
	error?: string;
}

export async function getFileText(id: string): Promise<ExtractedTextResponse> {
	return request<ExtractedTextResponse>(`/api/v1/files/${id}/text`, { method: 'GET' });
}

// POST /files/:id/reprocess — re-runs the whole pipeline (extract → embed).
// The separate /:id/embed step is gone with the second status (#33).
export async function triggerExtraction(
	id: string
): Promise<{ fileId: string; status: FileStatus; message?: string }> {
	return request(`/api/v1/files/${id}/reprocess`, { method: 'POST' });
}

export async function getFileMetadata(
	id: string
): Promise<Record<string, string>> {
	return request<Record<string, string>>(`/api/v1/files/${id}/metadata`, { method: 'GET' });
}

export async function setFileMetadata(
	id: string,
	metadata: Record<string, string>
): Promise<Record<string, string>> {
	return request<Record<string, string>>(`/api/v1/files/${id}/metadata`, {
		method: 'PUT',
		body: metadata
	});
}

export async function deleteFileMetadataKey(id: string, key: string): Promise<void> {
	await request<void>(`/api/v1/files/${id}/metadata/${encodeURIComponent(key)}`, {
		method: 'DELETE'
	});
}
