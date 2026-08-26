"use client";

import AppShell from "@/components/layout/AppShell";

export default function AuthenticatedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
