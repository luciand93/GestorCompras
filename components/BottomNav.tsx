"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import pkg from "@/package.json";

const navItems = [
  { href: "/", icon: "list_alt", label: "Listas" },
  { href: "/scanner", icon: "receipt_long", label: "Escáner" },
  { href: "/comparator", icon: "analytics", label: "Artículos" },
  { href: "/supermarkets", icon: "store", label: "Super" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a1a0d]/95 ios-blur border-t border-[#13ec37]/10 safe-area-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around py-2 px-6">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-4 transition-all ios-button",
                isActive
                  ? "text-[#13ec37]"
                  : "text-[#92c99b]/60 hover:text-[#92c99b]"
              )}
            >
              <span
                className="material-symbols-outlined text-[28px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className={cn(
                "text-[10px] uppercase tracking-wider",
                isActive ? "font-bold" : "font-medium"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="absolute top-0 right-2 -mt-4 bg-[#13ec37]/10 px-1.5 py-0.5 rounded text-[8px] font-mono text-[#92c99b]/40 backdrop-blur-sm pointer-events-none">
        v{pkg.version}
      </div>
    </nav>
  );
}
