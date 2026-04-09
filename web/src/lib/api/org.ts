import { request } from './client';

export interface Org {
	id: string;
	name: string;
	slug: string;
	plan: string;
	createdAt: string;
}

export interface Member {
	id: string;
	email: string;
	role: 'owner' | 'admin' | 'member';
	createdAt: string;
}

export interface InviteMemberInput {
	email: string;
	password: string;
	role: 'admin' | 'member';
}

export async function getOrg(token: string): Promise<Org> {
	const data = await request<{
		id: string;
		name: string;
		slug: string;
		plan: string;
		createdAt: string;
	}>('/api/v1/org', { method: 'GET', token });

	return {
		id: data.id,
		name: data.name,
		slug: data.slug,
		plan: data.plan,
		createdAt: data.createdAt
	};
}

export async function getMembers(token: string): Promise<Member[]> {
	const data = await request<Array<{
		id: string;
		email: string;
		role: string;
		createdAt: string;
	}>>('/api/v1/org/members', { method: 'GET', token });

	return data.map(m => ({
		id: m.id,
		email: m.email,
		role: m.role as 'owner' | 'admin' | 'member',
		createdAt: m.createdAt
	}));
}

export async function inviteMember(token: string, input: InviteMemberInput): Promise<Member> {
	const data = await request<{
		id: string;
		email: string;
		role: string;
	}>('/api/v1/org/members', {
		method: 'POST',
		token,
		body: input
	});

	return {
		id: data.id,
		email: data.email,
		role: data.role as 'admin' | 'member',
		createdAt: new Date().toISOString()
	};
}

export async function removeMember(token: string, id: string): Promise<void> {
	await request<void>(`/api/v1/org/members/${id}`, {
		method: 'DELETE',
		token
	});
}
