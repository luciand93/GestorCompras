"use client";

import { useState } from "react";
import { compareShoppingList, type ComparisonResult, type StoreTotal } from "@/app/actions/compare-list";

interface ListComparisonProps {
  onClose: () => void;
}

export function ListComparison({ onClose }: ListComparisonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [viewMode, setViewMode] = useState<'optimized' | 'single'>('optimized');

  const loadComparison = async () => {
    setLoading(true);
    const data = await compareShoppingList();
    setResult(data);
    setLoading(false);
  };

  useState(() => {
    loadComparison();
  });

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="bg-[#102213] rounded-2xl p-8 text-center">
          <span className="material-symbols-outlined text-5xl text-[#13ec37] animate-spin">sync</span>
          <p className="text-white mt-4">Comparando precios...</p>
        </div>
      </div>
    );
  }

  if (!result || result.error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70" onClick={onClose} />
        <div className="relative bg-[#102213] rounded-2xl p-6 max-w-md w-full border border-[#13ec37]/20">
          <div className="text-center">
            <span className="material-symbols-outlined text-5xl text-[#92c99b]/50 mb-4">info</span>
            <p className="text-white text-lg mb-2">{result?.error || "No hay datos"}</p>
            <p className="text-[#92c99b]/60 text-sm mb-6">Escanea tickets para obtener precios de productos</p>
            <button onClick={onClose} className="px-6 py-3 bg-[#13ec37] text-[#102213] font-bold rounded-xl">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const optimizedTotal = result.optimizedSplit.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#102213] rounded-t-3xl border-t border-[#13ec37]/20 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-[#102213] p-4 border-b border-[#13ec37]/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Comparar Lista</h2>
          <button onClick={onClose} className="text-[#92c99b] p-1">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Toggle */}
        <div className="p-4 flex gap-2">
          <button
            onClick={() => setViewMode('optimized')}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              viewMode === 'optimized' 
                ? 'bg-[#13ec37] text-[#102213]' 
                : 'bg-[#19331e] text-white border border-[#13ec37]/20'
            }`}
          >
            🎯 Optimizado
          </button>
          <button
            onClick={() => setViewMode('single')}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              viewMode === 'single' 
                ? 'bg-[#13ec37] text-[#102213]' 
                : 'bg-[#19331e] text-white border border-[#13ec37]/20'
            }`}
          >
            🏪 Una tienda
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {viewMode === 'optimized' ? (
            <>
              {/* Resumen optimizado */}
              <div className="bg-[#19331e] rounded-xl p-4 mb-4 border border-[#13ec37]/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#92c99b]">Total optimizado</span>
                  <span className="text-2xl font-black text-[#13ec37]">{optimizedTotal.toFixed(2)}€</span>
                </div>
                {result.totalSavings > 0 && (
                  <div className="flex items-center gap-2 text-sm text-[#13ec37]">
                    <span className="material-symbols-outlined text-sm">savings</span>
                    Ahorras {result.totalSavings.toFixed(2)}€ vs una sola tienda
                  </div>
                )}
              </div>

              {/* Lista por supermercado */}
              {result.optimizedSplit.map((store, i) => (
                <StoreCard key={i} store={store} highlight />
              ))}

              {/* Productos sin precio */}
              {result.products.filter(p => p.prices.length === 0).length > 0 && (
                <div className="mt-4 p-4 bg-amber-500/10 rounded-xl border border-amber-500/30">
                  <p className="text-amber-400 font-semibold mb-2">⚠️ Sin datos de precio:</p>
                  <ul className="text-amber-300/70 text-sm space-y-1">
                    {result.products.filter(p => p.prices.length === 0).map((p, i) => (
                      <li key={i}>• {p.productName}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Mejor tienda única */}
              {result.bestSingleStore ? (
                <>
                  <div className="bg-[#19331e] rounded-xl p-4 mb-4 border border-[#13ec37]/20">
                    <p className="text-[#92c99b] text-sm mb-1">Mejor opción en una sola tienda</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-white">{result.bestSingleStore.store}</span>
                      <span className="text-2xl font-black text-white">{result.bestSingleStore.total.toFixed(2)}€</span>
                    </div>
                  </div>
                  <StoreCard store={result.bestSingleStore} />
                </>
              ) : (
                <div className="text-center py-8 text-[#92c99b]/60">
                  No hay una tienda con todos los productos
                </div>
              )}
            </>
          )}
        </div>

        {/* Spacer */}
        <div className="h-8"></div>
      </div>
    </div>
  );
}

function StoreCard({ store, highlight }: { store: StoreTotal; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 mb-3 ${highlight ? 'bg-[#13ec37]/10 border border-[#13ec37]/30' : 'bg-[#19331e] border border-[#13ec37]/10'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#13ec37]">store</span>
          <span className="font-bold text-white">{store.store}</span>
        </div>
        <span className="font-black text-lg text-white">{store.total.toFixed(2)}€</span>
      </div>
      <div className="space-y-2">
        {store.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-[#92c99b]">
              {item.quantity > 1 ? `${item.quantity}x ` : ''}{item.name}
            </span>
            <span className="text-white">{(item.price * item.quantity).toFixed(2)}€</span>
          </div>
        ))}
      </div>
    </div>
  );
}
