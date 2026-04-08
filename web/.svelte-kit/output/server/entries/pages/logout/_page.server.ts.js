import { redirect } from "@sveltejs/kit";
const COOKIE_NAME = "kyro_token";
const actions = {
  default: async ({ cookies }) => {
    cookies.delete(COOKIE_NAME, { path: "/" });
    throw redirect(302, "/login");
  }
};
export {
  actions
};
