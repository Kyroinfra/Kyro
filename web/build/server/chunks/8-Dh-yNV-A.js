import { f as fail, r as redirect } from './index-aGhFOaj4.js';
import { r as removeMember, i as inviteMember, a as getOrg, g as getMembers } from './org-s3Tsii8L.js';
import './client-DJm-nEfN.js';

const load = async ({ locals }) => {
  const token = locals.user?.token;
  if (!token) {
    throw redirect(302, "/login");
  }
  try {
    const [org, members] = await Promise.all([getOrg(token), getMembers(token)]);
    return {
      org: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        createdAt: org.createdAt
      },
      members: members.map((m) => ({
        id: m.id,
        email: m.email,
        role: m.role,
        createdAt: m.createdAt
      }))
    };
  } catch (error) {
    console.error("Failed to load settings:", error);
    return { org: null, members: [] };
  }
};
const actions = {
  invite: async ({ request, locals }) => {
    const token = locals.user?.token;
    if (!token) {
      return fail(401, { error: "Unauthorized" });
    }
    const formData = await request.formData();
    const email = formData.get("email");
    const password = formData.get("password");
    const role = formData.get("role");
    if (!email || !password || !role) {
      return fail(400, { error: "All fields are required" });
    }
    try {
      await inviteMember(token, {
        email,
        password,
        role
      });
      return { success: true };
    } catch (error) {
      console.error("Failed to invite member:", error);
      return fail(500, { error: error.message || "Failed to invite member" });
    }
  },
  remove: async ({ request, locals }) => {
    const token = locals.user?.token;
    if (!token) {
      return fail(401, { error: "Unauthorized" });
    }
    const formData = await request.formData();
    const id = formData.get("id");
    if (!id) {
      return fail(400, { error: "Member ID is required" });
    }
    try {
      await removeMember(token, id);
      return { success: true };
    } catch (error) {
      console.error("Failed to remove member:", error);
      return fail(500, { error: error.message || "Failed to remove member" });
    }
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions,
  load: load
});

const index = 8;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-D5JACma5.js')).default;
const server_id = "src/routes/(app)/dashboard/settings/+page.server.ts";
const imports = ["_app/immutable/nodes/8.DjAgKzaL.js","_app/immutable/chunks/YCwS6Nwd.js","_app/immutable/chunks/zU3tt0ZV.js","_app/immutable/chunks/DfNsRTGw.js","_app/immutable/chunks/DsGEnUUF.js","_app/immutable/chunks/BLd6RmJV.js","_app/immutable/chunks/DcJwU2AC.js","_app/immutable/chunks/O45CYZ5-.js","_app/immutable/chunks/LIclGFG-.js","_app/immutable/chunks/D01j8eM4.js","_app/immutable/chunks/CN3MBsX5.js","_app/immutable/chunks/CIBs41Hl.js","_app/immutable/chunks/DJ-0-DwM.js","_app/immutable/chunks/M79jyEj8.js","_app/immutable/chunks/iYyw3Js1.js","_app/immutable/chunks/jEOsyNKi.js","_app/immutable/chunks/DB7_XQS2.js","_app/immutable/chunks/DuKILhZw.js","_app/immutable/chunks/D9ZDn9QB.js","_app/immutable/chunks/Bcchgmpc.js","_app/immutable/chunks/CX7HHjCR.js"];
const stylesheets = ["_app/immutable/assets/Button.BCXzFm4h.css","_app/immutable/assets/Card.BN6XTZFe.css","_app/immutable/assets/Badge.OH5zYe3V.css","_app/immutable/assets/ConfirmDialog.DH23h5hh.css","_app/immutable/assets/Modal.C2Xn3KKw.css","_app/immutable/assets/8.CB62I0E4.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=8-Dh-yNV-A.js.map
