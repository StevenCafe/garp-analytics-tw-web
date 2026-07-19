import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GARP Analytics Taiwan",
  description: "Research-driven growth-at-a-reasonable-price analytics for Taiwan equities.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
