import { f as fail, r as redirect } from './index-aGhFOaj4.js';
import { r as register } from './auth2-5vmrMwFg.js';
import { A as ApiError } from './client-DJm-nEfN.js';

const COOKIE_NAME = "kyro_token";
const actions = {
  default: async ({ request, cookies }) => {
    const formData = await request.formData();
    const orgName = formData.get("orgName");
    const email = formData.get("email");
    const password = formData.get("password");
    if (!orgName || !email || !password) {
      return fail(400, { error: "All fields are required" });
    }
    if (password.length < 8) {
      return fail(400, { error: "Password must be at least 8 characters" });
    }
    try {
      const response = await register({ orgName, email, password });
      cookies.set(COOKIE_NAME, response.token, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7
      });
      redirect(302, "/dashboard");
    } catch (err) {
      if (err?.status === 302 || err?.status === 301) {
        throw err;
      }
      if (err instanceof ApiError) {
        if (err.status === 400 && err.message === "Invalid input") {
          return fail(400, { error: "Please check your details — password must be at least 8 characters" });
        }
        return fail(err.status, { error: err.message });
      }
      if (err instanceof Response) {
        const data = await err.json().catch(() => ({ error: "Registration failed" }));
        return fail(err.status, { error: data.error || "Registration failed" });
      }
      console.error("Registration error:", err);
      return fail(500, { error: "An unexpected error occurred" });
    }
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions
});

const index = 11;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-BOJ4PvRN.js')).default;
const server_id = "src/routes/(auth)/register/+page.server.ts";
const imports = ["_app/immutable/nodes/11.DadOX_0m.js","_app/immutable/chunks/YCwS6Nwd.js","_app/immutable/chunks/zU3tt0ZV.js","_app/immutable/chunks/DsGEnUUF.js","_app/immutable/chunks/BLd6RmJV.js","_app/immutable/chunks/O45CYZ5-.js","_app/immutable/chunks/LIclGFG-.js","_app/immutable/chunks/D01j8eM4.js","_app/immutable/chunks/CN3MBsX5.js","_app/immutable/chunks/DJ-0-DwM.js","_app/immutable/chunks/M79jyEj8.js","_app/immutable/chunks/iYyw3Js1.js","_app/immutable/chunks/jEOsyNKi.js","_app/immutable/chunks/DfNsRTGw.js","_app/immutable/chunks/DFYTxGKz.js","_app/immutable/chunks/CgAGoN22.js","_app/immutable/chunks/DB7_XQS2.js"];
const stylesheets = ["_app/immutable/assets/Button.BCXzFm4h.css","_app/immutable/assets/Input.z93VMvzc.css","_app/immutable/assets/Card.BN6XTZFe.css","_app/immutable/assets/11.JPW5GxQl.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=11-Dwbo-nv5.js.map
