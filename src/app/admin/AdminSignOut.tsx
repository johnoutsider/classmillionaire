"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function AdminSignOut() {
  const router = useRouter();
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }
  return (
    <button
      onClick={signOut}
      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-blue-400 hover:bg-blue-900/50 hover:text-white transition"
    >
      <LogOut size={14} /> Sign out
    </button>
  );
}
