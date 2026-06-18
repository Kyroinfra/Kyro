import { json } from '@sveltejs/kit';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://api:3000';

export const GET = async () => {
	try {
		const res = await fetch(`${INTERNAL_API_URL}/api/v1/auth/setup-status`);
		const data = await res.json();
		return json({ exists: data.configured });
	} catch {
		return json({ exists: false });
	}
};
