import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./print.css";
import ThemeToggle from "@/components/ThemeToggle";
import ThemeInitScript from "@/components/ThemeInitScript";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "C182S Fuel Planner",
  description: "Fuel planning tool for the Cessna 182S",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
    shortcut: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* Prevent theme flash before hydration */}
        <ThemeInitScript />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-100`}
      >
        <div className="min-h-full">
          <header className="border-b border-gray-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 dark:border-slate-600 dark:bg-slate-900/60 dark:supports-[backdrop-filter]:bg-slate-900/40">
            <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-indigo-600 flex items-center justify-center font-bold text-white">
                  CF
                </div>
                <div>
                  <h1 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    Cessna 182S Fuel Planner
                  </h1>
                  <p className="text-xs text-gray-600 dark:text-slate-300">
                    POH Sect. 5 driven planning & graphs
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <a
                  className="text-xs text-gray-600 hover:text-gray-800 dark:text-slate-300 dark:hover:text-slate-200"
                  href="https://nextjs.org"
                  target="_blank"
                  rel="noreferrer"
                >
                  Built with Next.js
                </a>
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
