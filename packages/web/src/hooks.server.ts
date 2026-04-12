import jwt from 'jsonwebtoken';
import type { Handle } from '@sveltejs/kit';

const JWT_SECRET = process.env.JWT_SECRET || 'Kyro';
const COOKIE_NAME = 'kyro_token';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(COOKIE_NAME);

		if (token) {
		try {
			const decoded = jwt.verify(token, JWT_SECRET) as {
				userId: string;
				orgId: string;
				role: 'owner' | 'admin' | 'member';
			};
			event.locals.user = {
				id: decoded.userId,
				orgId: decoded.orgId,
				role: decoded.role,
				token
			};
		} catch {
			event.cookies.delete(COOKIE_NAME, { path: '/' });
		}
	}

	return resolve(event);
};
