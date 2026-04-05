import type { Metadata } from "next";
import "./globals.css";
import ThemeClient from "./ThemeClient";
import Sidebar from "../components/Sidebar";
import QueryProvider from "@/lib/queries/providers";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Beyond - Travel Adventures",
  description: "Catalog and share your traveling adventures",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeClient initialState={{ theme: "system" }}>
      <QueryProvider>
        <div className="flex">
          <Sidebar />
          <div className="flex-1 min-h-screen overflow-x-hidden relative bg-gray-50 dark:bg-gray-950 transition-colors duration-500">
            {/* Background Gradients */}
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
            
            <div className="relative z-10">
              {children}
            </div>
          </div>
        </div>
        <Toaster position="bottom-right" />
      </QueryProvider>
    </ThemeClient>
  );
}
