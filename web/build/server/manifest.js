const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.DS5YLwxx.js",app:"_app/immutable/entry/app.ByhOuN5e.js",imports:["_app/immutable/entry/start.DS5YLwxx.js","_app/immutable/chunks/DVUbXwDU.js","_app/immutable/chunks/D6Jx2OE9.js","_app/immutable/chunks/CP66TOUo.js","_app/immutable/chunks/8UtF8RsF.js","_app/immutable/chunks/CqTeEgW2.js","_app/immutable/entry/app.ByhOuN5e.js","_app/immutable/chunks/D6Jx2OE9.js","_app/immutable/chunks/8lVj8MXu.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/CqTeEgW2.js","_app/immutable/chunks/AZdVKLeb.js","_app/immutable/chunks/CP66TOUo.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-B9ladG6n.js')),
			__memo(() => import('./chunks/1-DmcjlRE5.js')),
			__memo(() => import('./chunks/2-s39MyNpy.js')),
			__memo(() => import('./chunks/3-C-AjVyNg.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/health",
				pattern: /^\/health\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: __memo(() => import('./chunks/_server.ts-x_nU-dws.js'))
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

const prerendered = new Set([]);

const base = "";

export { base, manifest, prerendered };
//# sourceMappingURL=manifest.js.map
