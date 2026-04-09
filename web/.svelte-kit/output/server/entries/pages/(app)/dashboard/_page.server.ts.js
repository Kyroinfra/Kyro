import { redirect } from "@sveltejs/kit";
import { g as getUsage } from "../../../../chunks/usage.js";
import { g as getKeys } from "../../../../chunks/keys.js";
import { g as getMembers } from "../../../../chunks/org.js";
const load = async ({ locals }) => {
  const token = locals.user?.token;
  if (!token) {
    throw redirect(302, "/login");
  }
  try {
    const [usage, keys, members] = await Promise.all([
      getUsage(token),
      getKeys(token),
      getMembers(token)
    ]);
    return {
      stats: {
        totalRequests: usage.total_requests,
        totalStorage: usage.total_storage,
        activeApiKeys: keys.filter((k) => !k.revoked_at).length,
        totalMembers: members.length
      }
    };
  } catch (error) {
    console.error("Failed to load dashboard stats:", error);
    return {
      stats: {
        totalRequests: 0,
        totalStorage: 0,
        activeApiKeys: 0,
        totalMembers: 1
      }
    };
  }
};
export {
  load
};
