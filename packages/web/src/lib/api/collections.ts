import { request } from './client';

export interface Collection {
	id: string;
	name: string;
	description: string | null;
	createdAt: string;
	updatedAt: string;
	fileCount: number;
	embeddedCount: number;
	pendingCount: number;
	failedCount: number;
}

export interface CollectionDetail extends Collection {
	skippedCount: number;
	queryReady: boolean;
}

export interface CollectionFile {
	id: string;
	name: string;
	mimeType: string;
	sizeBytes: number;
	// One pipeline status (#33)
	status: 'pending' | 'processing' | 'ready' | 'failed' | 'skipped';
	createdAt: string;
	addedAt: string;
}

export interface PaginatedCollectionFiles {
	data: CollectionFile[];
	pagination: {
		total: number;
		limit: number;
		offset: number;
		hasMore: boolean;
	};
}

export async function getCollections(): Promise<Collection[]> {
	return request<Collection[]>('/api/v1/collections', { method: 'GET' });
}

export async function getCollection(id: string): Promise<CollectionDetail> {
	return request<CollectionDetail>(`/api/v1/collections/${id}`, { method: 'GET' });
}

export async function createCollection(
	input: { name: string; description?: string }
): Promise<Collection> {
	return request<Collection>('/api/v1/collections', { method: 'POST', body: input });
}

export async function updateCollection(
	id: string,
	input: { name?: string; description?: string }
): Promise<Collection> {
	return request<Collection>(`/api/v1/collections/${id}`, { method: 'PATCH', body: input });
}

export async function deleteCollection(id: string): Promise<void> {
	await request<void>(`/api/v1/collections/${id}`, { method: 'DELETE' });
}

export async function getCollectionFiles(
	id: string,
	limit = 100,
	offset = 0
): Promise<PaginatedCollectionFiles> {
	return request<PaginatedCollectionFiles>(
		`/api/v1/collections/${id}/files?limit=${limit}&offset=${offset}`,
		{ method: 'GET' }
	);
}

export async function addFilesToCollection(
	id: string,
	fileIds: string[]
): Promise<{ added: number; collectionId: string }> {
	return request(`/api/v1/collections/${id}/files`, {
		method: 'POST',
		body: { fileIds }
	});
}

export async function removeFileFromCollection(
	id: string,
	fileId: string
): Promise<void> {
	await request<void>(`/api/v1/collections/${id}/files/${fileId}`, { method: 'DELETE' });
}
