import { r as redirect } from './index-aGhFOaj4.js';

const load = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, "/login");
  }
  return {
    user: locals.user
  };
};

var _layout_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 2;
let component_cache;
const component = async () => component_cache ??= (await import('./_layout.svelte-BGEMLUdU.js')).default;
const server_id = "src/routes/(app)/+layout.server.ts";
const imports = ["_app/immutable/nodes/2.CeDPzQxW.js","_app/immutable/chunks/YCwS6Nwd.js","_app/immutable/chunks/zU3tt0ZV.js","_app/immutable/chunks/DfNsRTGw.js","_app/immutable/chunks/DsGEnUUF.js","_app/immutable/chunks/M79jyEj8.js","_app/immutable/chunks/BLd6RmJV.js","_app/immutable/chunks/DcJwU2AC.js","_app/immutable/chunks/hxtzvCDW.js","_app/immutable/chunks/iYyw3Js1.js","_app/immutable/chunks/jEOsyNKi.js","_app/immutable/chunks/CDTVu6V1.js","_app/immutable/chunks/D01j8eM4.js","_app/immutable/chunks/CN3MBsX5.js","_app/immutable/chunks/CIBs41Hl.js","_app/immutable/chunks/CYn5yhgH.js"];
const stylesheets = ["_app/immutable/assets/2.CE0hdgJE.css"];
const fonts = [];

export { component, fonts, imports, index, _layout_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=2-DtJd1fC6.js.map
