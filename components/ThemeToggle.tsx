"use client";
import React from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || (!saved && el.classList.contains("dark"))) {
      el.classList.add("dark");
      setIsDark(true);
    } else if (saved === "light") {
      el.classList.remove("dark");
      setIsDark(false);
    } else {
      // Fallback to system preference on first load
      const sysDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (sysDark) {
        el.classList.add("dark");
        setIsDark(true);
      }
    }
  }, []);

  const toggle = () => {
    const el = document.documentElement;
    const next = !isDark;
    setIsDark(next);
    if (next) {
      el.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      el.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium
                 bg-white text-gray-900 border-gray-300 hover:bg-gray-50
                 dark:bg-slate-700 dark:text-slate-50 dark:border-slate-600 hover:dark:bg-slate-600"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      <span className="hidden sm:inline">{isDark ? "Dark" : "Light"} mode</span>
      <span aria-hidden>{isDark ? "🌙" : "☀️"}</span>
    </button>
  );
}
