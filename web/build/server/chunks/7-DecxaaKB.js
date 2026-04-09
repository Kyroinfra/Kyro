import { f as fail, r as redirect } from './index-aGhFOaj4.js';
import { d as deleteKey, c as createKey, g as getKeys } from './keys-8Nk1pJI6.js';
import './client-DJm-nEfN.js';

const load = async ({ locals }) => {
  const token = locals.user?.token;
  if (!token) {
    throw redirect(302, "/login");
  }
  try {
    const keys = await getKeys(token);
    return {
      keys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.key_prefix,
        scopes: k.scopes,
        lastUsedAt: k.last_used_at,
        createdAt: k.created_at,
        revokedAt: k.revoked_at
      }))
    };
  } catch (error) {
    console.error("Failed to load keys:", error);
    return { keys: [] };
  }
};
const actions = {
  create: async ({ request, locals }) => {
    const token = locals.user?.token;
    if (!token) {
      return fail(401, { error: "Unauthorized" });
    }
    const formData = await request.formData();
    const name = formData.get("name");
    const scopes = formData.getAll("scopes");
    if (!name || name.trim() === "") {
      return fail(400, { error: "Name is required" });
    }
    try {
      const result = await createKey(token, name.trim(), scopes.length > 0 ? scopes : ["read"]);
      return {
        success: true,
        newKey: result.key
      };
    } catch (error) {
      console.error("Failed to create key:", error);
      return fail(500, { error: error.message || "Failed to create key" });
    }
  },
  delete: async ({ request, locals }) => {
    const token = locals.user?.token;
    if (!token) {
      return fail(401, { error: "Unauthorized" });
    }
    const formData = await request.formData();
    const id = formData.get("id");
    if (!id) {
      return fail(400, { error: "Key ID is required" });
    }
    try {
      await deleteKey(token, id);
      return { success: true };
    } catch (error) {
      console.error("Failed to delete key:", error);
      return fail(500, { error: error.message || "Failed to delete key" });
    }
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions,
  load: load
});

const index = 7;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-BuwxMOCS.js')).default;
const server_id = "src/routes/(app)/dashboard/keys/+page.server.ts";
const imports = ["_app/immutable/nodes/7.gvnneOfx.js","_app/immutable/chunks/DZwSLX2Z.js","_app/immutable/chunks/3XXCvPdB.js","_app/immutable/chunks/BUmqaiss.js","_app/immutable/chunks/DS_4LgDl.js","_app/immutable/chunks/Da68X3bz.js","_app/immutable/chunks/B7BfngDa.js","_app/immutable/chunks/BH4nSG3p.js","_app/immutable/chunks/ClNiKQUw.js","_app/immutable/chunks/CrObsK50.js","_app/immutable/chunks/B2uZkV7-.js","_app/immutable/chunks/0GQzDTP3.js","_app/immutable/chunks/DJsyG93u.js","_app/immutable/chunks/KE5BuHwQ.js","_app/immutable/chunks/DMrLlhSi.js","_app/immutable/chunks/C_8Apa7u.js","_app/immutable/chunks/lyhFc5Hl.js","_app/immutable/chunks/g7IjeW3Q.js","_app/immutable/chunks/CTB0_nu1.js","_app/immutable/chunks/B_rlEXQQ.js","_app/immutable/chunks/D52yZNg9.js","_app/immutable/chunks/DKEdLMEQ.js","_app/immutable/chunks/B5oMeby0.js"];
const stylesheets = ["_app/immutable/assets/Button.0TkAx1vZ.css","_app/immutable/assets/Card.YXoaD-YW.css","_app/immutable/assets/Badge.C3IP6rTe.css","_app/immutable/assets/ConfirmDialog.MZXjpw2f.css","_app/immutable/assets/Modal.9NjLaI47.css","_app/immutable/assets/7.DtRtg0HR.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=7-DecxaaKB.js.map
