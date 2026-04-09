import { redirect } from "@sveltejs/kit";
import { g as getKeys } from "../../../../../chunks/keys.js";
import { g as getFiles } from "../../../../../chunks/files.js";
const load = async ({ locals }) => {
  const token = locals.user?.token;
  if (!token) {
    throw redirect(302, "/login");
  }
  try {
    const keys = await getKeys(token);
    const activeKeys = keys.filter((k) => !k.revoked_at);
    const apiKey = activeKeys[0]?.key_prefix ? `${activeKeys[0].key_prefix}_placeholder` : null;
    if (apiKey) {
      try {
        const files = await getFiles(apiKey);
        return {
          files: files.map((f) => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            sizeBytes: f.sizeBytes,
            createdAt: f.createdAt
          })),
          hasApiKey: true,
          apiKeyPrefix: activeKeys[0].key_prefix
        };
      } catch {
        return {
          files: [],
          hasApiKey: true,
          apiKeyPrefix: activeKeys[0].key_prefix
        };
      }
    }
    return {
      files: [],
      hasApiKey: false,
      apiKeyPrefix: null
    };
  } catch (error) {
    console.error("Failed to load files:", error);
    return { files: [], hasApiKey: false, apiKeyPrefix: null };
  }
};
export {
  load
};
