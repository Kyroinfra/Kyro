const PUBLIC_API_URL = "http://api:3000";
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}
async function request(path, options = {}) {
  const { method = "GET", body, token, apiKey } = options;
  const headers = {
    "Content-Type": "application/json"
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }
  const res = await fetch(`${PUBLIC_API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : void 0
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, error.error ?? "Request failed");
  }
  return res.json();
}
async function register(data) {
  return request("/api/v1/auth/register", {
    method: "POST",
    body: data
  });
}
async function login(data) {
  return request("/api/v1/auth/login", {
    method: "POST",
    body: data
  });
}
export {
  login as l,
  register as r
};
