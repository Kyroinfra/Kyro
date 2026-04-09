import { r as redirect } from './index-aGhFOaj4.js';
import { g as getUsage, a as getDailyUsage } from './usage-W3Blznep.js';
import './client-DJm-nEfN.js';

const load = async ({ locals }) => {
  const token = locals.user?.token;
  if (!token) {
    throw redirect(302, "/login");
  }
  try {
    const [stats, dailyData] = await Promise.all([
      getUsage(token),
      getDailyUsage(token)
    ]);
    return {
      stats: {
        totalRequests: stats.total_requests,
        totalBytesIn: stats.total_bytes_in,
        totalBytesOut: stats.total_bytes_out,
        totalStorage: stats.total_storage,
        activeApiKeys: stats.active_api_keys
      },
      daily: dailyData.map((d) => ({
        date: d.date,
        requests: d.requests,
        bytesIn: d.bytes_in,
        bytesOut: d.bytes_out
      }))
    };
  } catch (error) {
    console.error("Failed to load usage:", error);
    return {
      stats: {
        totalRequests: 0,
        totalBytesIn: 0,
        totalBytesOut: 0,
        totalStorage: 0,
        activeApiKeys: 0
      },
      daily: []
    };
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 9;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-PkqDE5gL.js')).default;
const server_id = "src/routes/(app)/dashboard/usage/+page.server.ts";
const imports = ["_app/immutable/nodes/9.CYVrgkJ_.js","_app/immutable/chunks/DZwSLX2Z.js","_app/immutable/chunks/3XXCvPdB.js","_app/immutable/chunks/B2uZkV7-.js","_app/immutable/chunks/DS_4LgDl.js","_app/immutable/chunks/BH4nSG3p.js","_app/immutable/chunks/DJsyG93u.js","_app/immutable/chunks/C5RLLPHO.js","_app/immutable/chunks/C_8Apa7u.js","_app/immutable/chunks/lyhFc5Hl.js","_app/immutable/chunks/Da68X3bz.js","_app/immutable/chunks/0GQzDTP3.js","_app/immutable/chunks/g7IjeW3Q.js","_app/immutable/chunks/BUmqaiss.js","_app/immutable/chunks/CTB0_nu1.js","_app/immutable/chunks/B5oMeby0.js"];
const stylesheets = ["_app/immutable/assets/Button.0TkAx1vZ.css","_app/immutable/assets/Card.YXoaD-YW.css","_app/immutable/assets/9.BVLIzMHJ.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=9-CSCo7ixP.js.map
