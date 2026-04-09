class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}
function getBaseUrl() {
  return process.env.INTERNAL_API_URL || "http://api:3000";
}
async function request(path, options = {}) {
  const { method = "GET", body, token, apiKey } = options;
  const headers = {
    "Content-Type": "application/json"
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
    body: body ? JSON.stringify(body) : void 0
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, error.error ?? "Request failed");
  }
  return res.json();
}
export {
  ApiError as A,
  request as r
};
