import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_COOKIE } from "@/lib/auth/tokens";
import { currentUser } from "@/services/auth/auth.service";

export async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;

  if (!token) {
    redirect("/login");
  }

  let user;
  try {
    user = await currentUser(token);
  } catch {
    redirect("/login");
  }

  if (user.role !== "admin") {
    redirect("/home");
  }

  return user;
}