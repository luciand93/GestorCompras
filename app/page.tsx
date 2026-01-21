import { ShoppingList } from "@/components/ShoppingList";

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Mi Lista de Compras</h1>
        <p className="text-muted-foreground text-sm">
          Gestiona tus compras de forma inteligente
        </p>
      </div>
      <ShoppingList />
    </main>
  );
}
