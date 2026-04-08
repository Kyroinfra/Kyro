import { fail, redirect } from "@sveltejs/kit";
import { r as register } from "../../../../chunks/auth2.js";
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
    try {
      const response = await register({ orgName, email, password });
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
      if (err instanceof Response && err.status === 400) {
        const data = await err.json();
        return fail(400, { error: data.error || "Registration failed" });
      }
      if (err instanceof Response) {
        const data = await err.json();
        return fail(err.status, { error: data.error || "Registration failed" });
      }
      console.error("Registration error:", err);
      return fail(500, { error: "An unexpected error occurred" });
    }
  }
};
export {
  actions
};
