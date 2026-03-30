import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
