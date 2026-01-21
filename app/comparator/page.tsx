import { ComparatorView } from "@/components/ComparatorView";

export default function ComparatorPage() {
  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Comparador de Precios</h1>
        <p className="text-muted-foreground text-sm">
          Compara precios entre supermercados antes de comprar
        </p>
      </div>
      <ComparatorView />
    </main>
  );
}
