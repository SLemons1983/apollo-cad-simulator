import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apollo CAD",
  description: "Apollo computer-aided dispatch operations"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
