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
const component = async () => component_cache ??= (await import('./_layout.svelte-DQme2qrJ.js')).default;
const server_id = "src/routes/(app)/+layout.server.ts";
const imports = ["_app/immutable/nodes/2.D5ChuZ5A.js","_app/immutable/chunks/D9X3bhrP.js","_app/immutable/chunks/DSO6KSvc.js","_app/immutable/chunks/BgRcHo-8.js","_app/immutable/chunks/BWEgucHS.js","_app/immutable/chunks/B_BJkjwr.js","_app/immutable/chunks/8aEpVSis.js","_app/immutable/chunks/BA3RtdGJ.js","_app/immutable/chunks/DwVROJgw.js","_app/immutable/chunks/CN1DuuxE.js","_app/immutable/chunks/BQ9Ea9cL.js","_app/immutable/chunks/Br81YZxS.js","_app/immutable/chunks/BQpe9GFT.js","_app/immutable/chunks/BXeC4F4p.js","_app/immutable/chunks/CZ4yzBX_.js"];
const stylesheets = ["_app/immutable/assets/2.2-KzuV8d.css"];
const fonts = [];

export { component, fonts, imports, index, _layout_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=2-Bn1TWhNy.js.map
