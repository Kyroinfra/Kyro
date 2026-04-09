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
const component = async () => component_cache ??= (await import('./_page.svelte-CArq1Urz.js')).default;
const server_id = "src/routes/(app)/dashboard/keys/+page.server.ts";
const imports = ["_app/immutable/nodes/7.CMqYGf1d.js","_app/immutable/chunks/YCwS6Nwd.js","_app/immutable/chunks/zU3tt0ZV.js","_app/immutable/chunks/DfNsRTGw.js","_app/immutable/chunks/DsGEnUUF.js","_app/immutable/chunks/BLd6RmJV.js","_app/immutable/chunks/DcJwU2AC.js","_app/immutable/chunks/O45CYZ5-.js","_app/immutable/chunks/LIclGFG-.js","_app/immutable/chunks/D01j8eM4.js","_app/immutable/chunks/CN3MBsX5.js","_app/immutable/chunks/iYyw3Js1.js","_app/immutable/chunks/jEOsyNKi.js","_app/immutable/chunks/CgAGoN22.js","_app/immutable/chunks/CIBs41Hl.js","_app/immutable/chunks/DJ-0-DwM.js","_app/immutable/chunks/M79jyEj8.js","_app/immutable/chunks/DB7_XQS2.js","_app/immutable/chunks/DuKILhZw.js","_app/immutable/chunks/Bcchgmpc.js","_app/immutable/chunks/D9ZDn9QB.js","_app/immutable/chunks/CX7HHjCR.js"];
const stylesheets = ["_app/immutable/assets/Button.BCXzFm4h.css","_app/immutable/assets/Card.BN6XTZFe.css","_app/immutable/assets/Badge.OH5zYe3V.css","_app/immutable/assets/ConfirmDialog.DH23h5hh.css","_app/immutable/assets/Modal.C2Xn3KKw.css","_app/immutable/assets/7.B7cN7njT.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=7-CtCl2WvW.js.map
