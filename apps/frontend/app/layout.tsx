import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Toaster } from "@/components/ui/Toaster";

export const metadata: Metadata = {
  title: "XenoCRM — AI-Native Customer Relationship Manager",
  description: "Chat-first AI CRM for modern brand marketers. Segment customers, draft messages, and launch campaigns with natural language.",
  keywords: ["CRM", "AI", "marketing", "campaigns", "customer segments"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=clash-grotesk@500,600,700&f[]=plus-jakarta-sans@400,500,600,700&display=swap" />
      </head>
      <body className="antialiased">
        <div className="flex h-screen overflow-hidden bg-[#F0F4F8]">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
