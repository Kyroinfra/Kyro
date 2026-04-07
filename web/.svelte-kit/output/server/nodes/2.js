

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/2.DA0hmIlU.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/D6Jx2OE9.js","_app/immutable/chunks/8UtF8RsF.js"];
export const stylesheets = [];
export const fonts = [];
