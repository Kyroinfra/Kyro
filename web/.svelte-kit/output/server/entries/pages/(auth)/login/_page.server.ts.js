import { fail, redirect } from "@sveltejs/kit";
import { l as login } from "../../../../chunks/auth2.js";
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
export {
  actions
};
