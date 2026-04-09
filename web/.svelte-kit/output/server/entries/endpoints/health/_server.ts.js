import { json } from "@sveltejs/kit";
function GET() {
  return json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
}
export {
  GET
};
