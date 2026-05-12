"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-blue-300 hover:bg-blue-900/50 hover:text-white transition",
        className
      )}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
      {isDark ? "Light theme" : "Dark theme"}
    </button>
  );
}
