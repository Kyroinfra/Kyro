const GET = async ({ url, cookies }) => {
  const key = url.searchParams.get("key");
  const id = url.searchParams.get("id");
  if (!key || !id) {
    return new Response("Missing key or id", { status: 400 });
  }
  const token = cookies.get("kyro_token");
  const internalUrl = process.env.INTERNAL_API_URL || "http://api:3000";
  const response = await fetch(`${internalUrl}/api/v1/files/${id}`, {
    headers: {
      "X-API-Key": key,
      "Authorization": token ? `Bearer ${token}` : ""
    }
  });
  if (!response.ok) {
    return new Response("File not found", { status: response.status });
  }
  const headers = new Headers();
  headers.set("Content-Type", response.headers.get("Content-Type") || "application/octet-stream");
  headers.set("Content-Disposition", response.headers.get("Content-Disposition") || "attachment");
  return new Response(response.body, {
    headers,
    status: 200
  });
};

export { GET };
//# sourceMappingURL=_server.ts-C_8jF7cr.js.map
