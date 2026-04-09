import * as server from '../entries/pages/(app)/_layout.server.ts.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(app)/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/(app)/+layout.server.ts";
export const imports = ["_app/immutable/nodes/2.CeDPzQxW.js","_app/immutable/chunks/YCwS6Nwd.js","_app/immutable/chunks/zU3tt0ZV.js","_app/immutable/chunks/DfNsRTGw.js","_app/immutable/chunks/DsGEnUUF.js","_app/immutable/chunks/M79jyEj8.js","_app/immutable/chunks/BLd6RmJV.js","_app/immutable/chunks/DcJwU2AC.js","_app/immutable/chunks/hxtzvCDW.js","_app/immutable/chunks/iYyw3Js1.js","_app/immutable/chunks/jEOsyNKi.js","_app/immutable/chunks/CDTVu6V1.js","_app/immutable/chunks/D01j8eM4.js","_app/immutable/chunks/CN3MBsX5.js","_app/immutable/chunks/CIBs41Hl.js","_app/immutable/chunks/CYn5yhgH.js"];
export const stylesheets = ["_app/immutable/assets/2.CE0hdgJE.css"];
export const fonts = [];
