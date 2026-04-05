import type { Metadata } from "next";
import "./globals.css";
import ThemeClient from "./ThemeClient";
import Sidebar from "../components/Sidebar";

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
      <div className="flex">
        <Sidebar />
        <div className="flex-1 min-h-screen overflow-x-hidden">
          {children}
        </div>
      </div>
    </ThemeClient>
  );
}
