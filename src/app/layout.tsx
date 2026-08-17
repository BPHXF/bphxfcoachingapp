import type { Metadata, Viewport } from "next";
import "./globals.css";
import { OfflineSyncProvider } from "@/components/OfflineSyncProvider";

export const metadata: Metadata = {
  title: "BPHXF",
  description: "Train 1:1 with your coach or follow along with the public library.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#1C1E1D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="mx-auto flex min-h-screen max-w-md flex-col bg-chalk font-sans">
        <OfflineSyncProvider />
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
