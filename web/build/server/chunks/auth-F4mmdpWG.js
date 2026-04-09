import { w as writable, d as derived } from './index-Dw650lR_.js';

const user = writable(null);
derived(user, ($user) => $user !== null);
derived(user, ($user) => $user?.role === "owner");
derived(user, ($user) => $user?.role === "admin" || $user?.role === "owner");

export { user as u };
//# sourceMappingURL=auth-F4mmdpWG.js.map
