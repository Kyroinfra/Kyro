import { r as redirect } from './index-aGhFOaj4.js';
import { g as getUsage } from './usage2-W3Blznep.js';
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
const component = async () => component_cache ??= (await import('./_page.svelte-DHEBav2p.js')).default;
const server_id = "src/routes/(app)/dashboard/+page.server.ts";
const imports = ["_app/immutable/nodes/5.CamhXra2.js","_app/immutable/chunks/YCwS6Nwd.js","_app/immutable/chunks/zU3tt0ZV.js","_app/immutable/chunks/DsGEnUUF.js","_app/immutable/chunks/BLd6RmJV.js","_app/immutable/chunks/DcJwU2AC.js","_app/immutable/chunks/hxtzvCDW.js","_app/immutable/chunks/O45CYZ5-.js","_app/immutable/chunks/DB7_XQS2.js","_app/immutable/chunks/M79jyEj8.js","_app/immutable/chunks/jEOsyNKi.js","_app/immutable/chunks/DfNsRTGw.js","_app/immutable/chunks/DJ-0-DwM.js","_app/immutable/chunks/iYyw3Js1.js","_app/immutable/chunks/CYn5yhgH.js"];
const stylesheets = ["_app/immutable/assets/Card.BN6XTZFe.css","_app/immutable/assets/Button.BCXzFm4h.css","_app/immutable/assets/5.BPcnjOco.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=5-VgvQFUaF.js.map
