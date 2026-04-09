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
const component = async () => component_cache ??= (await import('./_layout.svelte-18XRyDyP.js')).default;
const server_id = "src/routes/(app)/+layout.server.ts";
const imports = ["_app/immutable/nodes/2.D2V8t8t7.js","_app/immutable/chunks/DZwSLX2Z.js","_app/immutable/chunks/3XXCvPdB.js","_app/immutable/chunks/BUmqaiss.js","_app/immutable/chunks/DS_4LgDl.js","_app/immutable/chunks/lyhFc5Hl.js","_app/immutable/chunks/B7BfngDa.js","_app/immutable/chunks/0GQzDTP3.js","_app/immutable/chunks/DJsyG93u.js","_app/immutable/chunks/NT6K0qjx.js","_app/immutable/chunks/CrObsK50.js","_app/immutable/chunks/B2uZkV7-.js","_app/immutable/chunks/DMrLlhSi.js"];
const stylesheets = ["_app/immutable/assets/2.2-KzuV8d.css"];
const fonts = [];

export { component, fonts, imports, index, _layout_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=2-Cn7Djxo1.js.map
