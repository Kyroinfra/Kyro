import { r as redirect } from './index-aGhFOaj4.js';
import { g as getUsage, a as getDailyUsage } from './usage2-W3Blznep.js';
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
const component = async () => component_cache ??= (await import('./_page.svelte-Be2aIKXu.js')).default;
const server_id = "src/routes/(app)/dashboard/usage/+page.server.ts";
const imports = ["_app/immutable/nodes/9.DD5xo4wP.js","_app/immutable/chunks/YCwS6Nwd.js","_app/immutable/chunks/zU3tt0ZV.js","_app/immutable/chunks/CN3MBsX5.js","_app/immutable/chunks/DsGEnUUF.js","_app/immutable/chunks/O45CYZ5-.js","_app/immutable/chunks/jEOsyNKi.js","_app/immutable/chunks/ClbVEVfc.js","_app/immutable/chunks/DJ-0-DwM.js","_app/immutable/chunks/M79jyEj8.js","_app/immutable/chunks/BLd6RmJV.js","_app/immutable/chunks/iYyw3Js1.js","_app/immutable/chunks/DfNsRTGw.js","_app/immutable/chunks/DB7_XQS2.js","_app/immutable/chunks/CX7HHjCR.js"];
const stylesheets = ["_app/immutable/assets/Button.BCXzFm4h.css","_app/immutable/assets/Card.BN6XTZFe.css","_app/immutable/assets/9.Mgi6DjxR.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=9-tGeaH_Ga.js.map
