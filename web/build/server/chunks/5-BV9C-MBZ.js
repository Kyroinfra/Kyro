import { r as redirect } from './index-aGhFOaj4.js';
import { g as getUsage } from './usage-W3Blznep.js';
import { g as getKeys } from './keys-8Nk1pJI6.js';
import { g as getMembers } from './org-s3Tsii8L.js';
import './client-DJm-nEfN.js';

const load = async ({ locals }) => {
  const token = locals.user?.token;
  if (!token) {
    throw redirect(302, "/login");
  }
  try {
    const [usage, keys, members] = await Promise.all([
      getUsage(token),
      getKeys(token),
      getMembers(token)
    ]);
    return {
      stats: {
        totalRequests: usage.total_requests,
        totalStorage: usage.total_storage,
        activeApiKeys: keys.filter((k) => !k.revoked_at).length,
        totalMembers: members.length
      }
    };
  } catch (error) {
    console.error("Failed to load dashboard stats:", error);
    return {
      stats: {
        totalRequests: 0,
        totalStorage: 0,
        activeApiKeys: 0,
        totalMembers: 1
      }
    };
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 5;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-D2c12fEe.js')).default;
const server_id = "src/routes/(app)/dashboard/+page.server.ts";
const imports = ["_app/immutable/nodes/5.D-N9iwHk.js","_app/immutable/chunks/DZwSLX2Z.js","_app/immutable/chunks/3XXCvPdB.js","_app/immutable/chunks/DS_4LgDl.js","_app/immutable/chunks/BH4nSG3p.js","_app/immutable/chunks/CTB0_nu1.js","_app/immutable/chunks/lyhFc5Hl.js","_app/immutable/chunks/DJsyG93u.js","_app/immutable/chunks/g7IjeW3Q.js","_app/immutable/chunks/BUmqaiss.js","_app/immutable/chunks/DMrLlhSi.js","_app/immutable/chunks/B5oMeby0.js"];
const stylesheets = ["_app/immutable/assets/Card.YXoaD-YW.css","_app/immutable/assets/5.-0v6aK7C.css","_app/immutable/assets/Badge.C3IP6rTe.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=5-BV9C-MBZ.js.map
