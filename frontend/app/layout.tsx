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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeClient initialState={{ theme: "system" }}>
      <QueryProvider>
        <AuthProvider>
          <AuthLayoutWrapper>
            {children}
          </AuthLayoutWrapper>
          <Toaster position="bottom-right" />
        </AuthProvider>
      </QueryProvider>
    </ThemeClient>
  );
}
