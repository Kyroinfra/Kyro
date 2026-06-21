import { browser } from "$app/environment";
import { env } from "$env/dynamic/public";

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
  apiKey?: string;
};

function getBaseUrl(): string {
  if (browser) {
    console.log("[DEBUG-V3]", env.PUBLIC_API_URL);
    return env.PUBLIC_API_URL || "";
  }
  return process.env.INTERNAL_API_URL || "http://api:3000";
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, token, apiKey } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (apiKey) headers["X-API-Key"] = apiKey;

  const isFormData = body instanceof FormData;
  if (isFormData) {
    delete headers["Content-Type"];
  }

  const url = `${getBaseUrl()}${path}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, error.error ?? "Request failed");
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
