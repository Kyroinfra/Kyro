import { r as request } from './client-DJm-nEfN.js';

async function getOrg(token) {
  const data = await request("/api/v1/org", { method: "GET", token });
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    plan: data.plan,
    createdAt: data.createdAt
  };
}
async function getMembers(token) {
  const data = await request("/api/v1/org/members", { method: "GET", token });
  return data.map((m) => ({
    id: m.id,
    email: m.email,
    role: m.role,
    createdAt: m.createdAt
  }));
}
async function inviteMember(token, input) {
  const data = await request("/api/v1/org/members", {
    method: "POST",
    token,
    body: input
  });
  return {
    id: data.id,
    email: data.email,
    role: data.role,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function removeMember(token, id) {
  await request(`/api/v1/org/members/${id}`, {
    method: "DELETE",
    token
  });
}

export { getOrg as a, getMembers as g, inviteMember as i, removeMember as r };
//# sourceMappingURL=org-s3Tsii8L.js.map
