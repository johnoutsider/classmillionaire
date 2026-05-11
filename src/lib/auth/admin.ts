import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

/**
 * Single source of truth for "is the currently-signed-in user the platform admin?"
 *
 * Admin status is decided purely by an env-var allowlist (ADMIN_EMAIL).
 * No DB column, no per-user flag — rotating admins is a deploy, not a query.
 *
 * Case-insensitive match; whitespace is trimmed. If ADMIN_EMAIL is unset,
 * no one is admin (fail-closed).
 */
function adminEmail(): string | null {
  const raw = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return raw ? raw : null;
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return false;

  const allowed = adminEmail();
  if (!allowed) return false;
  return user.email.trim().toLowerCase() === allowed;
}

/**
 * Server-side guard for admin-only pages. Calls notFound() (HTTP 404) if the
 * caller is not the admin — same response as a non-existent route, so the
 * existence of /admin can't be inferred by probing.
 */
export async function requireAdmin(): Promise<void> {
  const ok = await isCurrentUserAdmin();
  if (!ok) notFound();
}
