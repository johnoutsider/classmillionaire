import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (forwardedHost ? `${proto}://${forwardedHost}` : origin);

  return NextResponse.redirect(`${base}/dashboard`);
}
