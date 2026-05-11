"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  BarChart2,
  LogOut,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sets", label: "Question Sets", icon: BookOpen },
  { href: "/students", label: "Students", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
];

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <aside className="w-60 flex flex-col border-r border-blue-900 bg-millionaire-mid shrink-0">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-blue-900">
        <span className="text-xl font-bold text-gold-light tracking-tight">ClassMillion</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
                active
                  ? "bg-blue-900 text-yellow-300"
                  : "text-blue-300 hover:bg-blue-900/50 hover:text-white"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User / sign out */}
      <div className="px-3 py-4 border-t border-blue-900">
        <p className="px-3 text-xs text-blue-500 truncate mb-2">{userEmail}</p>
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-blue-300 hover:bg-blue-900/50 hover:text-white transition"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
