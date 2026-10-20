import jwt from 'jsonwebtoken';
import type { Handle } from '@sveltejs/kit';

// Required at module load (#30): a missing JWT_SECRET would silently sign
// sessions with a constant — anyone could forge a session token. The API
// already fail-fasts on the same var (config getRequired); the web must
// too. Compose files pass JWT_SECRET in both dev and prod.
const JWT_SECRET = process.env.JWT_SECRET ?? (() => {
	throw new Error('JWT_SECRET must be set — refusing to start with forgeable sessions');
})();
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
