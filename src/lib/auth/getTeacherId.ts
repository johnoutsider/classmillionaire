import { createClient } from "@/lib/supabase/server";

/**
 * Returns the current teacher's id (= Supabase auth.users.id).
 * Throws "Unauthorized" if no session — every server action and
 * teacher-scoped query MUST use this before touching the database.
 */
export async function getTeacherId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}
