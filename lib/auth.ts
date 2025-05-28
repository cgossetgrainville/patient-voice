import { cookies } from "next/headers";

export function isAdminAuthenticated() {
  const cookieStore = cookies();
  const session = cookieStore.get("admin_session");
  return session?.value === "true";
}