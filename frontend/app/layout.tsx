import type { Metadata } from "next";
import "./globals.css";
import ThemeClient from "./ThemeClient";

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
      {children}
    </ThemeClient>
  );
}
