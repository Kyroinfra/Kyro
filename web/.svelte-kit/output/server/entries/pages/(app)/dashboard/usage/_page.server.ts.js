import { redirect } from "@sveltejs/kit";
import { g as getUsage, a as getDailyUsage } from "../../../../../chunks/usage2.js";
const load = async ({ locals }) => {
  const token = locals.user?.token;
  if (!token) {
    throw redirect(302, "/login");
  }
  try {
    const [stats, dailyData] = await Promise.all([
      getUsage(token),
      getDailyUsage(token)
    ]);
    return {
      stats: {
        totalRequests: stats.total_requests,
        totalBytesIn: stats.total_bytes_in,
        totalBytesOut: stats.total_bytes_out,
        totalStorage: stats.total_storage,
        activeApiKeys: stats.active_api_keys
      },
      daily: dailyData.map((d) => ({
        date: d.date,
        requests: d.requests,
        bytesIn: d.bytes_in,
        bytesOut: d.bytes_out
      }))
    };
  } catch (error) {
    console.error("Failed to load usage:", error);
    return {
      stats: {
        totalRequests: 0,
        totalBytesIn: 0,
        totalBytesOut: 0,
        totalStorage: 0,
        activeApiKeys: 0
      },
      daily: []
    };
  }
};
export {
  load
};
