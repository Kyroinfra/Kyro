import { writable, derived } from 'svelte/store';

export type UserRole = 'owner' | 'admin' | 'member';

export interface User {
	id: string;
	email: string;
	role: UserRole;
	orgId: string;
	orgName?: string;
	plan?: string;
}

export interface Org {
	id: string;
	name: string;
	slug: string;
	plan: string;
}

export const user = writable<User | null>(null);
export const org = writable<Org | null>(null);
export const isAuthenticated = derived(user, ($user) => $user !== null);
export const isOwner = derived(user, ($user) => $user?.role === 'owner');
export const isAdmin = derived(user, ($user) => $user?.role === 'admin' || $user?.role === 'owner');
