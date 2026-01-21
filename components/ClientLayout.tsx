"use client";

import { BottomNav } from "@/components/BottomNav";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="min-h-screen bg-background pb-20 safe-area-bottom">
        {children}
      </div>
      <BottomNav />
    </>
  );
}
