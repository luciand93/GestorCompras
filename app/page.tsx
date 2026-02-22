"use client";

import { useState } from "react";
import { ShoppingList } from "@/components/ShoppingList";
import { DashboardView } from "@/components/DashboardView";
import Image from "next/image";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>('dashboard');

  return (
    <div className="min-h-screen bg-[#102213] text-white">
      {/* Header con logo */}
      <header className="sticky top-0 z-30 bg-[#102213]/80 ios-blur px-4 pt-8 pb-4 border-b border-[#13ec37]/10 flex flex-col gap-5">
        <div className="flex items-center gap-3 max-w-md mx-auto w-full">
          <Image
            src="/logo.png"
            alt="MiViis Logo"
            width={50}
            height={50}
            className="rounded-full"
          />
          <div>
            <h1 className="text-xl font-bold tracking-tight">GestorCompras</h1>
            <p className="text-xs text-[#13ec37] font-medium">Para los MiViis 💚</p>
          </div>
        </div>

        {/* Toggle Tabs */}
        <div className="bg-[#19331e] rounded-xl p-1 flex items-center justify-between max-w-md mx-auto w-full border border-[#13ec37]/20 shadow-inner">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 flex gap-2 justify-center py-2.5 rounded-lg font-bold transition-all ${activeTab === 'dashboard' ? 'bg-[#13ec37] text-black shadow-md' : 'text-[#92c99b]/60 hover:text-[#92c99b]'}`}
          >
            <span className="material-symbols-outlined">query_stats</span>
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 flex gap-2 justify-center py-2.5 rounded-lg font-bold transition-all ${activeTab === 'list' ? 'bg-[#13ec37] text-black shadow-md' : 'text-[#92c99b]/60 hover:text-[#92c99b]'}`}
          >
            <span className="material-symbols-outlined">checklist</span>
            Tu Lista
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto pt-6">
        {activeTab === 'dashboard' ? <DashboardView /> : <ShoppingList />}
      </div>
    </div>
  );
}
