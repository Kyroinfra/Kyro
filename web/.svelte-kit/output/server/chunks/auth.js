import { d as derived, w as writable } from "./index.js";
const user = writable(null);
derived(user, ($user) => $user !== null);
derived(user, ($user) => $user?.role === "owner");
derived(user, ($user) => $user?.role === "admin" || $user?.role === "owner");
export {
  user as u
};
