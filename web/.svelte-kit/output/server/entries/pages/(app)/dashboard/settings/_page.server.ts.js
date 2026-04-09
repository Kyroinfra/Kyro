import { fail, redirect } from "@sveltejs/kit";
import { r as removeMember, i as inviteMember, a as getOrg, g as getMembers } from "../../../../../chunks/org.js";
const load = async ({ locals }) => {
  const token = locals.user?.token;
  if (!token) {
    throw redirect(302, "/login");
  }
  try {
    const [org, members] = await Promise.all([getOrg(token), getMembers(token)]);
    return {
      org: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        createdAt: org.createdAt
      },
      members: members.map((m) => ({
        id: m.id,
        email: m.email,
        role: m.role,
        createdAt: m.createdAt
      }))
    };
  } catch (error) {
    console.error("Failed to load settings:", error);
    return { org: null, members: [] };
  }
};
const actions = {
  invite: async ({ request, locals }) => {
    const token = locals.user?.token;
    if (!token) {
      return fail(401, { error: "Unauthorized" });
    }
    const formData = await request.formData();
    const email = formData.get("email");
    const password = formData.get("password");
    const role = formData.get("role");
    if (!email || !password || !role) {
      return fail(400, { error: "All fields are required" });
    }
    try {
      await inviteMember(token, {
        email,
        password,
        role
      });
      return { success: true };
    } catch (error) {
      console.error("Failed to invite member:", error);
      return fail(500, { error: error.message || "Failed to invite member" });
    }
  },
  remove: async ({ request, locals }) => {
    const token = locals.user?.token;
    if (!token) {
      return fail(401, { error: "Unauthorized" });
    }
    const formData = await request.formData();
    const id = formData.get("id");
    if (!id) {
      return fail(400, { error: "Member ID is required" });
    }
    try {
      await removeMember(token, id);
      return { success: true };
    } catch (error) {
      console.error("Failed to remove member:", error);
      return fail(500, { error: error.message || "Failed to remove member" });
    }
  }
};
export {
  actions,
  load
};
