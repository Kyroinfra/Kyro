import { r as redirect } from './index-aGhFOaj4.js';

const COOKIE_NAME = "kyro_token";
const actions = {
  default: async ({ cookies }) => {
    cookies.delete(COOKIE_NAME, { path: "/" });
    throw redirect(302, "/login");
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions
});

const index = 13;
const server_id = "src/routes/logout/+page.server.ts";
const imports = [];
const stylesheets = [];
const fonts = [];

export { fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=13-CXXjCiQ4.js.map
