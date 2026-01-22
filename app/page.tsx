import { ShoppingList } from "@/components/ShoppingList";

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#102213] text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#102213]/80 ios-blur px-5 pt-12 pb-4 border-b border-[#13ec37]/10">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <h1 className="text-2xl font-bold tracking-tight">Mi Lista de Compras</h1>
        </div>
      </header>
      
      <div className="max-w-md mx-auto">
        <ShoppingList />
      </div>
    </div>
  );
}
