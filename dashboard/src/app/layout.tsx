import type { Metadata } from "next";

import AppProviders from "@/providers/AppProviders";

import "./globals.css";

export const metadata: Metadata = {
  title: "Helpdesk Operations Dashboard",
  description: "Realtime technician management for AI-triaged IT tickets.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
