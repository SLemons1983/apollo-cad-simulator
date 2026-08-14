import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apollo CAD Simulator",
  description: "Apollo MDT CAD development and demonstration simulator"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
