import { f as fail, r as redirect } from './index-aGhFOaj4.js';
import { l as login } from './auth2-5vmrMwFg.js';
import { A as ApiError } from './client-DJm-nEfN.js';

const COOKIE_NAME = "kyro_token";
const actions = {
  default: async ({ request, cookies }) => {
    const formData = await request.formData();
    const email = formData.get("email");
    const password = formData.get("password");
    if (!email || !password) {
      return fail(400, { error: "Email and password are required" });
    }
    try {
      const response = await login({ email, password });
      cookies.set(COOKIE_NAME, response.token, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7
      });
      throw redirect(302, "/dashboard");
    } catch (err) {
      if (err?.status === 302 || err?.status === 301) {
        throw err;
      }
      if (err instanceof ApiError) {
        if (err.status === 401) {
          return fail(401, { error: "Invalid email or password" });
        }
        return fail(err.status, { error: err.message });
      }
      if (err instanceof Response) {
        const data = await err.json().catch(() => ({ error: "Login failed" }));
        return fail(err.status, { error: data.error || "Login failed" });
      }
      console.error("Login error:", err);
      return fail(500, { error: "An unexpected error occurred" });
    }
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions
});

const index = 10;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-pJVvhAxv.js')).default;
const server_id = "src/routes/(auth)/login/+page.server.ts";
const imports = ["_app/immutable/nodes/10.DYZF86Fc.js","_app/immutable/chunks/YCwS6Nwd.js","_app/immutable/chunks/zU3tt0ZV.js","_app/immutable/chunks/DsGEnUUF.js","_app/immutable/chunks/BLd6RmJV.js","_app/immutable/chunks/O45CYZ5-.js","_app/immutable/chunks/LIclGFG-.js","_app/immutable/chunks/D01j8eM4.js","_app/immutable/chunks/CN3MBsX5.js","_app/immutable/chunks/DJ-0-DwM.js","_app/immutable/chunks/M79jyEj8.js","_app/immutable/chunks/iYyw3Js1.js","_app/immutable/chunks/jEOsyNKi.js","_app/immutable/chunks/DfNsRTGw.js","_app/immutable/chunks/DFYTxGKz.js","_app/immutable/chunks/CgAGoN22.js","_app/immutable/chunks/DB7_XQS2.js"];
const stylesheets = ["_app/immutable/assets/Button.BCXzFm4h.css","_app/immutable/assets/Input.z93VMvzc.css","_app/immutable/assets/Card.BN6XTZFe.css","_app/immutable/assets/10.DxZryHE0.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=10-BOJGI8aO.js.map
