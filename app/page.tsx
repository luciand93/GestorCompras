import { ShoppingList } from "@/components/ShoppingList";

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f2f2f7]">
      {/* iOS-style header */}
      <header className="sticky top-0 z-30 bg-white/80 ios-blur px-5 pt-12 pb-4 border-b border-slate-200">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <h1 className="text-3xl font-bold tracking-tight text-black">Mi Lista de Compras</h1>
          <button className="text-[#3b82f6] font-medium text-lg">Editar</button>
        </div>
      </header>
      
      <div className="max-w-md mx-auto">
        <ShoppingList />
      </div>
    </div>
  );
}
