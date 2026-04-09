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
		client: {start:"_app/immutable/entry/start.CKPpsUNw.js",app:"_app/immutable/entry/app.XmM3GPWI.js",imports:["_app/immutable/entry/start.CKPpsUNw.js","_app/immutable/chunks/DeUnD-_x.js","_app/immutable/chunks/B2uZkV7-.js","_app/immutable/chunks/3XXCvPdB.js","_app/immutable/chunks/DS_4LgDl.js","_app/immutable/chunks/BCwQtCSw.js","_app/immutable/entry/app.XmM3GPWI.js","_app/immutable/chunks/3XXCvPdB.js","_app/immutable/chunks/DS_4LgDl.js","_app/immutable/chunks/DZwSLX2Z.js","_app/immutable/chunks/B2uZkV7-.js","_app/immutable/chunks/Da68X3bz.js","_app/immutable/chunks/C5RLLPHO.js","_app/immutable/chunks/g7IjeW3Q.js","_app/immutable/chunks/BUmqaiss.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-BLriq32x.js')),
			__memo(() => import('./chunks/1-BQTgSFTE.js')),
			__memo(() => import('./chunks/2-UyB5FI_K.js')),
			__memo(() => import('./chunks/3-BJiLVaC0.js')),
			__memo(() => import('./chunks/4-DFFmP3g5.js')),
			__memo(() => import('./chunks/5-Bw8mfowg.js')),
			__memo(() => import('./chunks/6-Dl9YiUav.js')),
			__memo(() => import('./chunks/7-CchDHdOX.js')),
			__memo(() => import('./chunks/8-B3VBG88R.js')),
			__memo(() => import('./chunks/9-CSCo7ixP.js')),
			__memo(() => import('./chunks/10-BrNrrNB0.js')),
			__memo(() => import('./chunks/11-CwtvSUVV.js')),
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
