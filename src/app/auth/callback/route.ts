import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Always stay on the host the user actually came in through, so the
  // session cookie set on that host is still present at /dashboard.
  // NEXT_PUBLIC_SITE_URL is only a last-resort fallback for environments
  // where neither x-forwarded-host nor the request origin is reliable.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const base = forwardedHost
    ? `${proto}://${forwardedHost}`
    : (origin || process.env.NEXT_PUBLIC_SITE_URL || "");

  return NextResponse.redirect(`${base}/dashboard`);
}
