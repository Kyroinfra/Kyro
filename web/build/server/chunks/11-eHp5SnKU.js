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
const component = async () => component_cache ??= (await import('./_page.svelte-Dw21-OU9.js')).default;
const server_id = "src/routes/(auth)/register/+page.server.ts";
const imports = ["_app/immutable/nodes/11.QJUZZeIK.js","_app/immutable/chunks/DZwSLX2Z.js","_app/immutable/chunks/3XXCvPdB.js","_app/immutable/chunks/DS_4LgDl.js","_app/immutable/chunks/Da68X3bz.js","_app/immutable/chunks/BH4nSG3p.js","_app/immutable/chunks/ClNiKQUw.js","_app/immutable/chunks/CrObsK50.js","_app/immutable/chunks/B2uZkV7-.js","_app/immutable/chunks/C_8Apa7u.js","_app/immutable/chunks/lyhFc5Hl.js","_app/immutable/chunks/0GQzDTP3.js","_app/immutable/chunks/DJsyG93u.js","_app/immutable/chunks/g7IjeW3Q.js","_app/immutable/chunks/BUmqaiss.js","_app/immutable/chunks/COh4xjO_.js","_app/immutable/chunks/KE5BuHwQ.js","_app/immutable/chunks/CTB0_nu1.js"];
const stylesheets = ["_app/immutable/assets/Button.0TkAx1vZ.css","_app/immutable/assets/Input.CbceVVV_.css","_app/immutable/assets/Card.YXoaD-YW.css","_app/immutable/assets/11.Xhk6UxIK.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=11-eHp5SnKU.js.map
