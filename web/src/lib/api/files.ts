import { request } from './client';

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

export async function getFiles(apiKey: string): Promise<FileItem[]> {
	const files = await request<Array<{
		id: string;
		name: string;
		mime_type: string;
		size_bytes: number;
		created_at: string;
	}>>('/api/v1/files', { method: 'GET', apiKey });

	return files.map(f => ({
		id: f.id,
		name: f.name,
		mimeType: f.mime_type,
		sizeBytes: f.size_bytes,
		createdAt: f.created_at
	}));
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

		xhr.open('POST', '/api/v1/files');
		xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`);
		
		const fd = new FormData();
		fd.append('file', file);
		xhr.send(fd);
	});
}

export function getDownloadUrl(id: string, apiKey: string): string {
	return `/api/v1/files/${id}?key=${apiKey}`;
}
