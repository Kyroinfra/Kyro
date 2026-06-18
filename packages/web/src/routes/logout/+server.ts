import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const COOKIE_NAME = 'kyro_token';

export const POST: RequestHandler = async ({ cookies }) => {
	cookies.delete(COOKIE_NAME, { path: '/' });
	return new Response(null, { status: 204 });
};
