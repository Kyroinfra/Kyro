import * as server from '../entries/pages/(app)/_layout.server.ts.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(app)/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/(app)/+layout.server.ts";
export const imports = ["_app/immutable/nodes/2.iJHyxAnW.js","_app/immutable/chunks/DZwSLX2Z.js","_app/immutable/chunks/3XXCvPdB.js","_app/immutable/chunks/BUmqaiss.js","_app/immutable/chunks/DS_4LgDl.js","_app/immutable/chunks/lyhFc5Hl.js","_app/immutable/chunks/B7BfngDa.js","_app/immutable/chunks/0GQzDTP3.js","_app/immutable/chunks/DJsyG93u.js","_app/immutable/chunks/BfRf3Tgf.js","_app/immutable/chunks/DeUnD-_x.js","_app/immutable/chunks/B2uZkV7-.js","_app/immutable/chunks/BCwQtCSw.js","_app/immutable/chunks/DMrLlhSi.js"];
export const stylesheets = ["_app/immutable/assets/2.2-KzuV8d.css"];
export const fonts = [];
