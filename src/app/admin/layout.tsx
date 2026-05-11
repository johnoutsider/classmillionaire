import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, LayoutDashboard, Users } from "lucide-react";
import AdminSignOut from "./AdminSignOut";

/**
 * Admin shell. The requireAdmin() call is the ONLY security gate that matters
 * for everything under /admin/*. If it doesn't throw, the user is the admin.
 * A non-admin probing this URL gets a 404, not a 403 — the route is
 * indistinguishable from a missing page.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen bg-millionaire-dark">
      <aside className="w-56 flex flex-col border-r border-blue-900 bg-millionaire-mid shrink-0">
        <div className="px-5 py-6 border-b border-blue-900">
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest">
            Admin
          </span>
          <p className="text-lg font-bold text-gold-light mt-1">ClassMillion</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
          <AdminLink href="/admin" icon={<LayoutDashboard size={16} />} label="Overview" />
          <AdminLink href="/admin/users" icon={<Users size={16} />} label="Users" />
        </nav>

        <div className="px-3 py-4 border-t border-blue-900 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-blue-400 hover:bg-blue-900/50 hover:text-white transition"
          >
            <ArrowLeft size={14} /> Back to app
          </Link>
          <p className="px-3 pt-2 text-[10px] text-blue-600 truncate">{user?.email}</p>
          <AdminSignOut />
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}

function AdminLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-blue-300 hover:bg-blue-900/50 hover:text-white transition"
    >
      {icon}
      {label}
    </Link>
  );
}
