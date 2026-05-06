import type { Metadata } from "next";
import "./globals.css";
import ThemeClient from "./ThemeClient";
import Sidebar from "../components/Sidebar";
import AuthProvider from "../components/AuthProvider";
import QueryProvider from "@/lib/queries/providers";
import { Toaster } from "react-hot-toast";
import AuthLayoutWrapper from "../components/AuthLayoutWrapper";

export const metadata: Metadata = {
  title: "Beyond - Travel Adventures",
  description: "Catalog and share your traveling adventures",
};

// Runs synchronously during HTML parse, before React hydrates.
// Applies the `dark` class immediately so there is no flash of light mode.
// Dark is the default; only an explicit "light" preference disables it.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'){document.documentElement.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased text-gray-900 bg-white dark:bg-gray-900 dark:text-gray-100 min-h-screen">
        <ThemeClient>
          <QueryProvider>
            <AuthProvider>
              <AuthLayoutWrapper>
                {children}
              </AuthLayoutWrapper>
              <Toaster position="bottom-right" />
            </AuthProvider>
          </QueryProvider>
        </ThemeClient>
      </body>
    </html>
  );
}
