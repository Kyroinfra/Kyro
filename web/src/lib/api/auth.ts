import { request, type ApiError } from './client';
import type { User, Org } from '$lib/stores/auth';

export interface RegisterInput {
	email: string;
	password: string;
	orgName: string;
}

export interface LoginInput {
	email: string;
	password: string;
}

export interface AuthResponse {
	token: string;
	user: {
		id: string;
		email: string;
		role: string;
		orgId: string;
	};
}

export interface MeResponse {
	id: string;
	email: string;
	role: string;
	orgId: string;
}

export interface OrgResponse {
	id: string;
	name: string;
	slug: string;
	plan: string;
}

export async function register(data: RegisterInput): Promise<AuthResponse> {
	return request<AuthResponse>('/api/v1/auth/register', {
		method: 'POST',
		body: data
	});
}

export async function login(data: LoginInput): Promise<AuthResponse> {
	return request<AuthResponse>('/api/v1/auth/login', {
		method: 'POST',
		body: data
	});
}

export async function getMe(): Promise<MeResponse> {
	return request<MeResponse>('/api/v1/auth/me');
}

export async function getOrg(): Promise<OrgResponse> {
	return request<OrgResponse>('/api/v1/org');
}
