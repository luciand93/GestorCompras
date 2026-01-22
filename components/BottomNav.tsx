"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: "list_alt", label: "Listas" },
  { href: "/scanner", icon: "receipt_long", label: "Escáner" },
  { href: "/comparator", icon: "analytics", label: "Comparar" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-[#102213]/90 ios-blur border-t border-slate-200 dark:border-white/10 safe-area-bottom">
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
                  ? "text-primary"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              )}
            >
              <span 
                className={cn(
                  "material-symbols-outlined text-[28px]",
                  isActive && "font-bold"
                )}
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
    </nav>
  );
}
