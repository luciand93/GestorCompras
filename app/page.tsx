import { ShoppingList } from "@/components/ShoppingList";
import Image from "next/image";

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#102213] text-white">
      {/* Header con logo */}
      <header className="sticky top-0 z-30 bg-[#102213]/80 ios-blur px-4 pt-8 pb-4 border-b border-[#13ec37]/10">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <Image 
            src="/logo.png" 
            alt="MiViis Logo" 
            width={50} 
            height={50}
            className="rounded-full"
          />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Lista de Compras</h1>
            <p className="text-xs text-[#13ec37] font-medium">Para los MiViis 💚</p>
          </div>
        </div>
      </header>
      
      <div className="max-w-md mx-auto">
        <ShoppingList />
      </div>
    </div>
  );
}
