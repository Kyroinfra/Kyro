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
const component = async () => component_cache ??= (await import('./_page.svelte-CDVZM3-Z.js')).default;
const server_id = "src/routes/(app)/dashboard/files/+page.server.ts";
const imports = ["_app/immutable/nodes/6.BmxlgzcW.js","_app/immutable/chunks/DZwSLX2Z.js","_app/immutable/chunks/3XXCvPdB.js","_app/immutable/chunks/BUmqaiss.js","_app/immutable/chunks/DS_4LgDl.js","_app/immutable/chunks/Da68X3bz.js","_app/immutable/chunks/B7BfngDa.js","_app/immutable/chunks/BH4nSG3p.js","_app/immutable/chunks/0GQzDTP3.js","_app/immutable/chunks/DJsyG93u.js","_app/immutable/chunks/KE5BuHwQ.js","_app/immutable/chunks/C5RLLPHO.js","_app/immutable/chunks/BCwQtCSw.js","_app/immutable/chunks/B2uZkV7-.js","_app/immutable/chunks/DMrLlhSi.js","_app/immutable/chunks/C_8Apa7u.js","_app/immutable/chunks/lyhFc5Hl.js","_app/immutable/chunks/g7IjeW3Q.js","_app/immutable/chunks/CTB0_nu1.js","_app/immutable/chunks/DKEdLMEQ.js","_app/immutable/chunks/BZj1ekxd.js","_app/immutable/chunks/B5oMeby0.js","_app/immutable/chunks/D0UjEzZS.js"];
const stylesheets = ["_app/immutable/assets/Button.0TkAx1vZ.css","_app/immutable/assets/Card.YXoaD-YW.css","_app/immutable/assets/ConfirmDialog.MZXjpw2f.css","_app/immutable/assets/6.CZNeZZbn.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=6-Dl9YiUav.js.map
