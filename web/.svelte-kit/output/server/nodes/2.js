import * as server from '../entries/pages/(app)/_layout.server.ts.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(app)/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/(app)/+layout.server.ts";
export const imports = ["_app/immutable/nodes/2.D5ChuZ5A.js","_app/immutable/chunks/D9X3bhrP.js","_app/immutable/chunks/DSO6KSvc.js","_app/immutable/chunks/BgRcHo-8.js","_app/immutable/chunks/BWEgucHS.js","_app/immutable/chunks/B_BJkjwr.js","_app/immutable/chunks/8aEpVSis.js","_app/immutable/chunks/BA3RtdGJ.js","_app/immutable/chunks/DwVROJgw.js","_app/immutable/chunks/CN1DuuxE.js","_app/immutable/chunks/BQ9Ea9cL.js","_app/immutable/chunks/Br81YZxS.js","_app/immutable/chunks/BQpe9GFT.js","_app/immutable/chunks/BXeC4F4p.js","_app/immutable/chunks/CZ4yzBX_.js"];
export const stylesheets = ["_app/immutable/assets/2.2-KzuV8d.css"];
export const fonts = [];
