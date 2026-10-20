import type { RequestHandler } from './$types';

// Catch-all API proxy (#29/#42): with cors() removed, the browser talks to
// the API only same-origin — this handler forwards /api/* to the API service
// and keeps the session off the wire to the browser.
//
// Auth injection mirrors the API's own precedence (API key wins):
//   ?key=<apiKey>    -> X-API-Key header   (ApiKeyGate, legacy until #42)
//   kyro_token cookie -> Authorization: Bearer (dashboard session JWT)
// An Authorization header the client already sent is passed through as-is.
//
// Responses stream straight through unbuffered — required for POST /ask's
// SSE event stream.

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://api:3000';

// Hop-by-hop / recompressed headers we must not copy verbatim.
const STRIP_REQUEST_HEADERS = new Set([
  'host',
  'connection',
  'cookie', // never leak the browser's cookies to the API service
  'origin',
  'referer',
]);
const STRIP_RESPONSE_HEADERS = new Set([
  'transfer-encoding', // undici may decompress; framing is re-decided here
  'content-encoding',
  'connection',
]);

const handler: RequestHandler = async ({ request, params, url: requestUrl, cookies }) => {
  const url = `${INTERNAL_API_URL}/api/${params.path}${requestUrl.search}`;

  const headers = new Headers();
  request.headers.forEach((value, name) => {
    if (!STRIP_REQUEST_HEADERS.has(name)) {
      headers.set(name, value);
    }
  });

  // Auth injection — only what the client did not already provide.
  if (request.headers.get('x-api-key') === null) {
    const queryKey = requestUrl.searchParams.get('key');
    if (queryKey) {
      headers.set('x-api-key', queryKey);
      // The API-side precedence is key-first anyway; drop any bearer so the
      // resolved credential is unambiguous.
      headers.delete('authorization');
    } else {
      const token = cookies.get('kyro_token');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
    }
  }

  let body: ArrayBuffer | undefined;
  if (!['GET', 'HEAD'].includes(request.method)) {
    body = await request.arrayBuffer();
    if (body.byteLength === 0) {
      body = undefined;
    }
  }

  let apiRes: Response;
  try {
    apiRes = await fetch(url, { method: request.method, headers, body });
  } catch {
    return new Response(
      JSON.stringify({ error: 'API service unreachable' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const resHeaders = new Headers();
  apiRes.headers.forEach((value, name) => {
    if (!STRIP_RESPONSE_HEADERS.has(name)) {
      resHeaders.set(name, value);
    }
  });

  return new Response(apiRes.body, { status: apiRes.status, headers: resHeaders });
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
