/// <reference types="@sveltejs/kit" />

declare global {
	namespace App {
		interface Locals {
			user: {
				id: string;
				orgId: string;
				role: 'owner' | 'admin' | 'member';
				token?: string;
			} | null;
		}
	}
}

export {};
