import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";

export async function requireSession(returnTo: string) {
  const requestHeaders = await headers();
  const { auth } = getAuth();
  const session = await auth.api.getSession({ headers: requestHeaders, query: { disableCookieCache: true } });
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }
  return session;
}
