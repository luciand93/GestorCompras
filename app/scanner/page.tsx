import { ScannerView } from "@/components/ScannerView";

export default function ScannerPage() {
  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Escáner de Precios</h1>
        <p className="text-muted-foreground text-sm">
          Toma una foto de tu ticket o producto para extraer precios con IA
        </p>
      </div>
      <ScannerView />
    </main>
  );
}
