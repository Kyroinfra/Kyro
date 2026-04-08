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
		client: {start:"_app/immutable/entry/start.DoU1RpeK.js",app:"_app/immutable/entry/app.DpUsSXSb.js",imports:["_app/immutable/entry/start.DoU1RpeK.js","_app/immutable/chunks/Br81YZxS.js","_app/immutable/chunks/DSO6KSvc.js","_app/immutable/chunks/BWEgucHS.js","_app/immutable/chunks/BQpe9GFT.js","_app/immutable/entry/app.DpUsSXSb.js","_app/immutable/chunks/DSO6KSvc.js","_app/immutable/chunks/B_BJkjwr.js","_app/immutable/chunks/8aEpVSis.js","_app/immutable/chunks/D9X3bhrP.js","_app/immutable/chunks/BQpe9GFT.js","_app/immutable/chunks/OZ_HftU0.js","_app/immutable/chunks/C8eJI7Hd.js","_app/immutable/chunks/BgRcHo-8.js","_app/immutable/chunks/BWEgucHS.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-BWJ8H7rT.js')),
			__memo(() => import('./chunks/1-B_tksd6e.js')),
			__memo(() => import('./chunks/2-Bn1TWhNy.js')),
			__memo(() => import('./chunks/3-CXdRhwyd.js')),
			__memo(() => import('./chunks/4-DJHKRyEm.js')),
			__memo(() => import('./chunks/5-DLMBKVb6.js')),
			__memo(() => import('./chunks/6-Dc1KdXmP.js')),
			__memo(() => import('./chunks/7-Vwe-555l.js')),
			__memo(() => import('./chunks/8-4xKb680s.js')),
			__memo(() => import('./chunks/9-BJza7Uha.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/(app)/dashboard",
				pattern: /^\/dashboard\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/health",
				pattern: /^\/health\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: __memo(() => import('./chunks/_server.ts-DAO6dj4b.js'))
			},
			{
				id: "/(auth)/login",
				pattern: /^\/login\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/logout",
				pattern: /^\/logout\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/(auth)/register",
				pattern: /^\/register\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 7 },
				endpoint: null
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
