import * as server from '../entries/pages/(app)/dashboard/_page.server.ts.js';

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(app)/dashboard/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/(app)/dashboard/+page.server.ts";
export const imports = ["_app/immutable/nodes/5.D-N9iwHk.js","_app/immutable/chunks/DZwSLX2Z.js","_app/immutable/chunks/3XXCvPdB.js","_app/immutable/chunks/DS_4LgDl.js","_app/immutable/chunks/BH4nSG3p.js","_app/immutable/chunks/CTB0_nu1.js","_app/immutable/chunks/lyhFc5Hl.js","_app/immutable/chunks/DJsyG93u.js","_app/immutable/chunks/g7IjeW3Q.js","_app/immutable/chunks/BUmqaiss.js","_app/immutable/chunks/DMrLlhSi.js","_app/immutable/chunks/B5oMeby0.js"];
export const stylesheets = ["_app/immutable/assets/Card.YXoaD-YW.css","_app/immutable/assets/5.-0v6aK7C.css","_app/immutable/assets/Badge.C3IP6rTe.css"];
export const fonts = [];
