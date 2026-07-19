import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GARP Analytics Taiwan",
  description: "Daily Taiwan equity dashboard combining real closing prices, financial statements, fair value, earnings growth, and risk analysis.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
