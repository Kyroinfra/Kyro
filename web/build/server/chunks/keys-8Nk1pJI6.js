import { r as request } from './client-DJm-nEfN.js';

async function getKeys(token) {
  return request("/api/v1/keys", { method: "GET", token });
}
async function createKey(token, name, scopes) {
  return request("/api/v1/keys", {
    method: "POST",
    token,
    body: { name, scopes }
  });
}
async function deleteKey(token, id) {
  return request(`/api/v1/keys/${id}`, {
    method: "DELETE",
    token
  });
}

export { createKey as c, deleteKey as d, getKeys as g };
//# sourceMappingURL=keys-8Nk1pJI6.js.map
