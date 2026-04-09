export type UserRole = 'owner' | 'admin' | 'member';

export interface User {
	id: string;
	email: string;
	role: UserRole;
	orgId: string;
}

export interface Org {
	id: string;
	name: string;
	slug: string;
	plan: string;
}

export interface ApiKey {
	id: string;
	name: string;
	prefix: string;
	scopes: string[];
	createdAt: string;
	lastUsedAt: string | null;
}

export interface FileItem {
	id: string;
	name: string;
	size: number;
	mimeType: string;
	uploadedAt: string;
	uploadedBy: string;
}

export interface UsageStats {
	totalRequests: number;
	totalBandwidth: number;
	storageUsed: number;
}

export interface DailyUsage {
	date: string;
	requests: number;
	bandwidthIn: number;
	bandwidthOut: number;
}
