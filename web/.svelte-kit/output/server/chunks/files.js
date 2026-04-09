import { r as request } from "./client.js";
async function getFiles(apiKey) {
  const files = await request("/api/v1/files", { method: "GET", apiKey });
  return files.map((f) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mime_type,
    sizeBytes: f.size_bytes,
    createdAt: f.created_at
  }));
}
async function deleteFile(apiKey, id) {
  return request(`/api/v1/files/${id}`, {
    method: "DELETE",
    apiKey
  });
}
export {
  deleteFile as d,
  getFiles as g
};
