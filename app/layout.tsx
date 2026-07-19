import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "台灣 GARP 品質成長分析儀表板",
  description: "整合台股真實收盤價、財報、合理估值、獲利成長與風險的每日分析儀表板。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
