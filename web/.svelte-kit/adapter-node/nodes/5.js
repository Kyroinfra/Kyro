import * as server from '../entries/pages/(app)/dashboard/_page.server.ts.js';

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(app)/dashboard/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/(app)/dashboard/+page.server.ts";
export const imports = ["_app/immutable/nodes/5.CamhXra2.js","_app/immutable/chunks/YCwS6Nwd.js","_app/immutable/chunks/zU3tt0ZV.js","_app/immutable/chunks/DsGEnUUF.js","_app/immutable/chunks/BLd6RmJV.js","_app/immutable/chunks/DcJwU2AC.js","_app/immutable/chunks/hxtzvCDW.js","_app/immutable/chunks/O45CYZ5-.js","_app/immutable/chunks/DB7_XQS2.js","_app/immutable/chunks/M79jyEj8.js","_app/immutable/chunks/jEOsyNKi.js","_app/immutable/chunks/DfNsRTGw.js","_app/immutable/chunks/DJ-0-DwM.js","_app/immutable/chunks/iYyw3Js1.js","_app/immutable/chunks/CYn5yhgH.js"];
export const stylesheets = ["_app/immutable/assets/Card.BN6XTZFe.css","_app/immutable/assets/Button.BCXzFm4h.css","_app/immutable/assets/5.BPcnjOco.css"];
export const fonts = [];
