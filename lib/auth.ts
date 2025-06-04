import { cookies } from "next/headers";

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  return session?.value === "true";
}