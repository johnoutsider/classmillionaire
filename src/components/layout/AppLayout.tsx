import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { teachers } from "@/lib/db/schema";
import Sidebar from "./Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Ensure teacher row exists on first login
  await db.insert(teachers).values({ id: user.id, email: user.email! }).onConflictDoNothing();

  return (
    <div className="flex min-h-screen bg-millionaire-dark">
      <Sidebar userEmail={user.email ?? ""} />
      <main className="flex-1 overflow-auto flex flex-col items-center">
        <div className="w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
