import { request } from './client';

export interface Collection {
	id: string;
	name: string;
	description: string | null;
	slug: string;
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
	embeddingStatus: string;
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

export async function getCollections(apiKey: string): Promise<Collection[]> {
	return request<Collection[]>('/api/v2/collections', { method: 'GET', apiKey });
}

export async function getCollection(apiKey: string, id: string): Promise<CollectionDetail> {
	return request<CollectionDetail>(`/api/v2/collections/${id}`, { method: 'GET', apiKey });
}

export async function createCollection(
	apiKey: string,
	input: { name: string; description?: string }
): Promise<Collection> {
	return request<Collection>('/api/v2/collections', { method: 'POST', apiKey, body: input });
}

export async function updateCollection(
	apiKey: string,
	id: string,
	input: { name?: string; description?: string }
): Promise<Collection> {
	return request<Collection>(`/api/v2/collections/${id}`, { method: 'PATCH', apiKey, body: input });
}

export async function deleteCollection(apiKey: string, id: string): Promise<void> {
	await request<void>(`/api/v2/collections/${id}`, { method: 'DELETE', apiKey });
}

export async function getCollectionFiles(
	apiKey: string,
	id: string,
	limit = 100,
	offset = 0
): Promise<PaginatedCollectionFiles> {
	return request<PaginatedCollectionFiles>(
		`/api/v2/collections/${id}/files?limit=${limit}&offset=${offset}`,
		{ method: 'GET', apiKey }
	);
}

export async function addFilesToCollection(
	apiKey: string,
	id: string,
	fileIds: string[]
): Promise<{ added: number; collectionId: string }> {
	return request(`/api/v2/collections/${id}/files`, {
		method: 'POST',
		apiKey,
		body: { fileIds }
	});
}

export async function removeFileFromCollection(
	apiKey: string,
	id: string,
	fileId: string
): Promise<void> {
	await request<void>(`/api/v2/collections/${id}/files/${fileId}`, { method: 'DELETE', apiKey });
}
