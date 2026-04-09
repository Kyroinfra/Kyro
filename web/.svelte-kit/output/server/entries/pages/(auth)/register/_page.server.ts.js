import { fail, redirect } from "@sveltejs/kit";
import { r as register } from "../../../../chunks/auth2.js";
import { A as ApiError } from "../../../../chunks/client.js";
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
export {
  actions
};
