import { browser } from "$app/environment";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
};

/**
 * Base URL by environment (#42, same-origin finish):
 * - browser: "" — the dashboard talks only to its own origin; the SvelteKit
 *   catch-all proxy at /api forwards everything to the API service and
 *   injects the session cookie's JWT. There is no PUBLIC_API_URL anymore.
 * - SSR (page server loads): straight to the API container, INTERNAL_API_URL.
 */
function getBaseUrl(): string {
  if (browser) {
    return "";
  }
  return process.env.INTERNAL_API_URL || "http://api:3000";
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  const isFormData = body instanceof FormData;
  if (isFormData) {
    delete headers["Content-Type"];
  }

  const url = `${getBaseUrl()}${path}`;

  const res = await fetch(url, {
    method,
    headers,
    // #43: FormData bodies pass through untouched (fetch sets the multipart
    // boundary header) — the old code deleted Content-Type and then
    // JSON.stringify'd the FormData anyway.
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(
      res.status,
      typeof error.error === "string"
        ? error.error
        : (error.error?.message ?? "Request failed"),
    );
  }

  // 204 No Content (and any other empty response) — return void
  const contentLength = res.headers.get("content-length");
  const contentType   = res.headers.get("content-type") ?? "";
  if (
    res.status === 204 ||
    contentLength === "0" ||
    !contentType.includes("application/json")
  ) {
    return undefined as T;
  }

  return res.json();
}
