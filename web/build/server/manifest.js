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
		client: {start:"_app/immutable/entry/start.BFSzxueH.js",app:"_app/immutable/entry/app.Dbjzrmof.js",imports:["_app/immutable/entry/start.BFSzxueH.js","_app/immutable/chunks/D01j8eM4.js","_app/immutable/chunks/CN3MBsX5.js","_app/immutable/chunks/zU3tt0ZV.js","_app/immutable/chunks/DsGEnUUF.js","_app/immutable/entry/app.Dbjzrmof.js","_app/immutable/chunks/zU3tt0ZV.js","_app/immutable/chunks/DsGEnUUF.js","_app/immutable/chunks/YCwS6Nwd.js","_app/immutable/chunks/CN3MBsX5.js","_app/immutable/chunks/BLd6RmJV.js","_app/immutable/chunks/hxtzvCDW.js","_app/immutable/chunks/ClbVEVfc.js","_app/immutable/chunks/DfNsRTGw.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-DVPh0Y5N.js')),
			__memo(() => import('./chunks/1-BOZjrQz4.js')),
			__memo(() => import('./chunks/2-DtJd1fC6.js')),
			__memo(() => import('./chunks/3-DEUc0zYX.js')),
			__memo(() => import('./chunks/4-ok2Q9qHX.js')),
			__memo(() => import('./chunks/5-VgvQFUaF.js')),
			__memo(() => import('./chunks/6-CP2QTVcc.js').then(function (n) { return n._; })),
			__memo(() => import('./chunks/7-CtCl2WvW.js')),
			__memo(() => import('./chunks/8-Dh-yNV-A.js')),
			__memo(() => import('./chunks/9-tGeaH_Ga.js')),
			__memo(() => import('./chunks/10-BOJGI8aO.js')),
			__memo(() => import('./chunks/11-Dwbo-nv5.js')),
			__memo(() => import('./chunks/12-CWaKh0uw.js')),
			__memo(() => import('./chunks/13-CXXjCiQ4.js'))
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
				id: "/api/files/[id]",
				pattern: /^\/api\/files\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-C_8jF7cr.js'))
			},
			{
				id: "/(app)/dashboard",
				pattern: /^\/dashboard\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/(app)/dashboard/files",
				pattern: /^\/dashboard\/files\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/(app)/dashboard/keys",
				pattern: /^\/dashboard\/keys\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/(app)/dashboard/settings",
				pattern: /^\/dashboard\/settings\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/(app)/dashboard/usage",
				pattern: /^\/dashboard\/usage\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/health",
				pattern: /^\/health\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 12 },
				endpoint: __memo(() => import('./chunks/_server.ts-DAO6dj4b.js'))
			},
			{
				id: "/(auth)/login",
				pattern: /^\/login\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/logout",
				pattern: /^\/logout\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 13 },
				endpoint: null
			},
			{
				id: "/(auth)/register",
				pattern: /^\/register\/?$/,
				params: [],
				page: { layouts: [0,3,], errors: [1,,], leaf: 11 },
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
