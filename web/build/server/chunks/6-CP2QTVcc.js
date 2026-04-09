import { r as redirect } from './index-aGhFOaj4.js';
import { g as getKeys } from './keys-8Nk1pJI6.js';
import { r as request } from './client-DJm-nEfN.js';

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

const load = async ({ locals }) => {
  const token = locals.user?.token;
  if (!token) {
    throw redirect(302, "/login");
  }
  try {
    const keys = await getKeys(token);
    const activeKeys = keys.filter((k) => !k.revoked_at);
    const apiKey = activeKeys[0]?.key_prefix ? `${activeKeys[0].key_prefix}_placeholder` : null;
    if (apiKey) {
      try {
        const files = await getFiles(apiKey);
        return {
          files: files.map((f) => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            sizeBytes: f.sizeBytes,
            createdAt: f.createdAt
          })),
          hasApiKey: true,
          apiKeyPrefix: activeKeys[0].key_prefix
        };
      } catch {
        return {
          files: [],
          hasApiKey: true,
          apiKeyPrefix: activeKeys[0].key_prefix
        };
      }
    }
    return {
      files: [],
      hasApiKey: false,
      apiKeyPrefix: null
    };
  } catch (error) {
    console.error("Failed to load files:", error);
    return { files: [], hasApiKey: false, apiKeyPrefix: null };
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 6;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-ChOdyvmA.js')).default;
const server_id = "src/routes/(app)/dashboard/files/+page.server.ts";
const imports = ["_app/immutable/nodes/6.D1CQhOmS.js","_app/immutable/chunks/YCwS6Nwd.js","_app/immutable/chunks/zU3tt0ZV.js","_app/immutable/chunks/DfNsRTGw.js","_app/immutable/chunks/DsGEnUUF.js","_app/immutable/chunks/BLd6RmJV.js","_app/immutable/chunks/DcJwU2AC.js","_app/immutable/chunks/O45CYZ5-.js","_app/immutable/chunks/iYyw3Js1.js","_app/immutable/chunks/jEOsyNKi.js","_app/immutable/chunks/CgAGoN22.js","_app/immutable/chunks/CIBs41Hl.js","_app/immutable/chunks/DJ-0-DwM.js","_app/immutable/chunks/M79jyEj8.js","_app/immutable/chunks/DB7_XQS2.js","_app/immutable/chunks/D9ZDn9QB.js","_app/immutable/chunks/Us1VyxWH.js","_app/immutable/chunks/CX7HHjCR.js","_app/immutable/chunks/D0UjEzZS.js"];
const stylesheets = ["_app/immutable/assets/Button.BCXzFm4h.css","_app/immutable/assets/Card.BN6XTZFe.css","_app/immutable/assets/ConfirmDialog.DH23h5hh.css","_app/immutable/assets/6.CBD-qLsI.css"];
const fonts = [];

var _6 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  component: component,
  fonts: fonts,
  imports: imports,
  index: index,
  server: _page_server_ts,
  server_id: server_id,
  stylesheets: stylesheets
});

export { _6 as _, deleteFile as d, getFiles as g };
//# sourceMappingURL=6-CP2QTVcc.js.map
