import { f as fail, r as redirect } from './index-aGhFOaj4.js';
import { l as login } from './auth2-CqJbosSr.js';

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
        // 7 days
      });
      throw redirect(302, "/dashboard");
    } catch (err) {
      if (err instanceof Response && err.status === 401) {
        return fail(401, { error: "Invalid email or password" });
      }
      if (err instanceof Response) {
        const data = await err.json();
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

const index = 6;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-C2kiCRqY.js')).default;
const server_id = "src/routes/(auth)/login/+page.server.ts";
const imports = ["_app/immutable/nodes/6.C7mGIcCY.js","_app/immutable/chunks/D9X3bhrP.js","_app/immutable/chunks/DSO6KSvc.js","_app/immutable/chunks/Bsk8GBXU.js","_app/immutable/chunks/DeHCrfq2.js","_app/immutable/chunks/8aEpVSis.js","_app/immutable/chunks/BA3RtdGJ.js","_app/immutable/chunks/OZ_HftU0.js","_app/immutable/chunks/CN1DuuxE.js","_app/immutable/chunks/BQ9Ea9cL.js","_app/immutable/chunks/C8eJI7Hd.js","_app/immutable/chunks/BgRcHo-8.js","_app/immutable/chunks/BWEgucHS.js","_app/immutable/chunks/t6dUCnJ7.js","_app/immutable/chunks/B_BJkjwr.js","_app/immutable/chunks/DoTJH63p.js"];
const stylesheets = ["_app/immutable/assets/Button.0TkAx1vZ.css","_app/immutable/assets/Input.CbceVVV_.css","_app/immutable/assets/Card.YXoaD-YW.css","_app/immutable/assets/6.DPGHvfLf.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=6-Dc1KdXmP.js.map
