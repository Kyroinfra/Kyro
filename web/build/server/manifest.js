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
		client: {start:"_app/immutable/entry/start.C8fU0YSP.js",app:"_app/immutable/entry/app.BzZF9UEN.js",imports:["_app/immutable/entry/start.C8fU0YSP.js","_app/immutable/chunks/CrObsK50.js","_app/immutable/chunks/B2uZkV7-.js","_app/immutable/chunks/3XXCvPdB.js","_app/immutable/chunks/DS_4LgDl.js","_app/immutable/entry/app.BzZF9UEN.js","_app/immutable/chunks/3XXCvPdB.js","_app/immutable/chunks/DS_4LgDl.js","_app/immutable/chunks/DZwSLX2Z.js","_app/immutable/chunks/B2uZkV7-.js","_app/immutable/chunks/Da68X3bz.js","_app/immutable/chunks/C5RLLPHO.js","_app/immutable/chunks/g7IjeW3Q.js","_app/immutable/chunks/BUmqaiss.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-BLriq32x.js')),
			__memo(() => import('./chunks/1-che3wtxA.js')),
			__memo(() => import('./chunks/2-Cn7Djxo1.js')),
			__memo(() => import('./chunks/3-BJiLVaC0.js')),
			__memo(() => import('./chunks/4-DFFmP3g5.js')),
			__memo(() => import('./chunks/5-BV9C-MBZ.js')),
			__memo(() => import('./chunks/6-6kylS_cX.js').then(function (n) { return n._; })),
			__memo(() => import('./chunks/7-DecxaaKB.js')),
			__memo(() => import('./chunks/8-D_H4_63u.js')),
			__memo(() => import('./chunks/9-D-Qrw3HK.js')),
			__memo(() => import('./chunks/10-QMiKsiw0.js')),
			__memo(() => import('./chunks/11-eHp5SnKU.js')),
			__memo(() => import('./chunks/12-B_PuMmVz.js')),
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
