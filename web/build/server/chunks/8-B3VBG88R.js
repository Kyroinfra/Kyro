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
const component = async () => component_cache ??= (await import('./_page.svelte-sLpUgo4C.js')).default;
const server_id = "src/routes/(app)/dashboard/settings/+page.server.ts";
const imports = ["_app/immutable/nodes/8.SDAbGTDN.js","_app/immutable/chunks/DZwSLX2Z.js","_app/immutable/chunks/3XXCvPdB.js","_app/immutable/chunks/BUmqaiss.js","_app/immutable/chunks/DS_4LgDl.js","_app/immutable/chunks/Da68X3bz.js","_app/immutable/chunks/B7BfngDa.js","_app/immutable/chunks/BH4nSG3p.js","_app/immutable/chunks/BJ60_8AW.js","_app/immutable/chunks/DeUnD-_x.js","_app/immutable/chunks/B2uZkV7-.js","_app/immutable/chunks/BCwQtCSw.js","_app/immutable/chunks/DMrLlhSi.js","_app/immutable/chunks/C_8Apa7u.js","_app/immutable/chunks/lyhFc5Hl.js","_app/immutable/chunks/0GQzDTP3.js","_app/immutable/chunks/DJsyG93u.js","_app/immutable/chunks/g7IjeW3Q.js","_app/immutable/chunks/CTB0_nu1.js","_app/immutable/chunks/B_rlEXQQ.js","_app/immutable/chunks/DKEdLMEQ.js","_app/immutable/chunks/D52yZNg9.js","_app/immutable/chunks/B5oMeby0.js"];
const stylesheets = ["_app/immutable/assets/Button.0TkAx1vZ.css","_app/immutable/assets/Card.YXoaD-YW.css","_app/immutable/assets/Badge.C3IP6rTe.css","_app/immutable/assets/ConfirmDialog.MZXjpw2f.css","_app/immutable/assets/Modal.9NjLaI47.css","_app/immutable/assets/8.YRHiEY43.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=8-B3VBG88R.js.map
