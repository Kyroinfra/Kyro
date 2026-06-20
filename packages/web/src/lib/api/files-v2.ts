import { request } from './client';

export type ExtractionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
export type EmbeddingStatus = 'pending' | 'embedding' | 'completed' | 'failed' | 'skipped';

export interface FileItemV2 {
	id: string;
	name: string;
	mimeType: string;
	sizeBytes: number;
	createdAt: string;
	extractionStatus: ExtractionStatus;
}

export interface PaginatedFilesV2 {
	data: FileItemV2[];
	pagination: {
		limit: number;
		hasMore: boolean;
		nextCursor: string | null;
	};
}

export async function getFilesV2(
	apiKey: string,
	limit = 100,
	cursor?: string
): Promise<{ files: FileItemV2[]; nextCursor: string | null; hasMore: boolean }> {
	let url = `/api/v2/files?limit=${limit}`;
	if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;

	const res = await request<PaginatedFilesV2>(url, { method: 'GET', apiKey });

	return {
		files: res.data,
		nextCursor: res.pagination.nextCursor,
		hasMore: res.pagination.hasMore
	};
}

export interface SearchResultV2 {
	id: string;
	name: string;
	mimeType: string;
	sizeBytes: number;
	createdAt: string;
	rank: number;
	headline: string;
}

export async function searchFilesV2(
	apiKey: string,
	q: string,
	limit = 20
): Promise<SearchResultV2[]> {
	const res = await request<{ data: SearchResultV2[] }>(
		`/api/v2/files/search?q=${encodeURIComponent(q)}&limit=${limit}`,
		{ method: 'GET', apiKey }
	);
	return res.data;
}

export interface ExtractedTextResponse {
	fileId: string;
	extractionStatus: ExtractionStatus;
	extractedText: string | null;
	error?: string;
}

export async function getFileText(apiKey: string, id: string): Promise<ExtractedTextResponse> {
	return request<ExtractedTextResponse>(`/api/v2/files/${id}/text`, { method: 'GET', apiKey });
}

export async function triggerExtraction(
	apiKey: string,
	id: string
): Promise<{ fileId: string; extractionStatus: ExtractionStatus; message?: string; extractedText?: string }> {
	return request(`/api/v2/files/${id}/extract`, { method: 'POST', apiKey });
}

export interface EmbedResponse {
	fileId: string;
	embeddingStatus: EmbeddingStatus;
	chunksCreated: number;
}

export async function embedFileV2(apiKey: string, id: string): Promise<EmbedResponse> {
	return request<EmbedResponse>(`/api/v2/files/${id}/embed`, { method: 'POST', apiKey });
}

export async function getFileMetadata(
	apiKey: string,
	id: string
): Promise<Record<string, string>> {
	return request<Record<string, string>>(`/api/v2/files/${id}/metadata`, { method: 'GET', apiKey });
}

export async function setFileMetadata(
	apiKey: string,
	id: string,
	metadata: Record<string, string>
): Promise<Record<string, string>> {
	return request<Record<string, string>>(`/api/v2/files/${id}/metadata`, {
		method: 'PUT',
		apiKey,
		body: metadata
	});
}

export async function deleteFileMetadataKey(apiKey: string, id: string, key: string): Promise<void> {
	await request<void>(`/api/v2/files/${id}/metadata/${encodeURIComponent(key)}`, {
		method: 'DELETE',
		apiKey
	});
}
