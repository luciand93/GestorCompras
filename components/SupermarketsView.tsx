"use client";

import { useEffect, useState } from "react";
import {
  getSupermarkets,
  getProductsBySupermarket,
  type ProductAtSupermarket,
} from "@/app/actions/supermarkets";

const storeIcons: Record<string, string> = {
  mercadona: "storefront",
  carrefour: "local_mall",
  lidl: "shopping_bag",
  aldi: "store",
  dia: "shopping_basket",
  default: "store",
};

function getStoreIcon(name: string): string {
  const key = name.toLowerCase().replace(/\s+/g, "");
  for (const [k, icon] of Object.entries(storeIcons)) {
    if (k !== "default" && key.includes(k)) return icon;
  }
  return storeIcons.default;
}

function formatDate(s: string): string {
  try {
    const d = new Date(s);
    return d.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return s;
  }
}

export function SupermarketsView() {
  const [supermarkets, setSupermarkets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductAtSupermarket[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  useEffect(() => {
    getSupermarkets().then(({ data }) => {
      setSupermarkets(data ?? []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selected) {
      setProducts([]);
      return;
    }
    setProductsLoading(true);
    getProductsBySupermarket(selected).then(({ data }) => {
      setProducts(data ?? []);
      setProductsLoading(false);
    });
  }, [selected]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#102213] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-[#13ec37] animate-pulse">
            store
          </span>
          <p className="text-[#92c99b]">Cargando supermercados...</p>
        </div>
      </div>
    );
  }

  // Vista detalle de un supermercado
  if (selected) {
    return (
      <div className="min-h-screen bg-[#102213] text-white pb-24">
        <header className="sticky top-0 z-10 bg-[#102213]/80 ios-blur border-b border-white/10">
          <div className="flex items-center gap-3 p-4 max-w-md mx-auto">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="p-2 -ml-2 rounded-xl text-[#92c99b] hover:bg-white/5 ios-button"
              aria-label="Volver"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="w-10 h-10 rounded-xl bg-[#19331e] border border-[#13ec37]/20 flex items-center justify-center text-[#13ec37]">
              <span className="material-symbols-outlined text-xl">
                {getStoreIcon(selected)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate">{selected}</h1>
              <p className="text-xs text-[#92c99b]">
                Artículos comprados en este supermercado
              </p>
            </div>
          </div>
        </header>

        <main className="max-w-md mx-auto p-4">
          {productsLoading ? (
            <div className="py-12 flex flex-col items-center gap-3 text-[#92c99b]">
              <span className="material-symbols-outlined text-4xl animate-pulse">
                inventory_2
              </span>
              <p>Cargando artículos...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl bg-[#19331e] border border-[#13ec37]/20 py-12 px-6 text-center">
              <span className="material-symbols-outlined text-6xl text-[#92c99b]/30 mb-4">
                shopping_basket
              </span>
              <p className="text-[#92c99b]">
                Aún no hay artículos registrados en {selected}. Escanea un ticket
                de este supermercado para empezar.
              </p>
              <a
                href="/scanner"
                className="mt-6 inline-flex items-center gap-2 bg-[#13ec37] text-[#102213] font-bold py-3 px-6 rounded-xl ios-button"
              >
                <span className="material-symbols-outlined">receipt_long</span>
                Ir al escáner
              </a>
            </div>
          ) : (
            <ul className="space-y-2">
              {products.map((p) => (
                <li
                  key={p.product_id}
                  className="flex items-center justify-between gap-4 rounded-xl bg-[#19331e] border border-[#13ec37]/20 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white truncate">
                      {p.product_name}
                    </p>
                    <p className="text-xs text-[#92c99b] mt-0.5">
                      Último registro: {formatDate(p.last_date)}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-lg font-bold text-[#13ec37]">
                      {p.last_price.toFixed(2)}€
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    );
  }

  // Listado de supermercados
  return (
    <div className="min-h-screen bg-[#102213] text-white pb-24">
      <header className="sticky top-0 z-10 bg-[#102213]/80 ios-blur border-b border-white/10">
        <div className="p-4 max-w-md mx-auto">
          <h1 className="text-lg font-bold">Supermercados</h1>
          <p className="text-sm text-[#92c99b] mt-0.5">
            Toca uno para ver los artículos comprados allí
          </p>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {supermarkets.length === 0 ? (
          <div className="rounded-xl bg-[#19331e] border border-[#13ec37]/20 py-12 px-6 text-center">
            <span className="material-symbols-outlined text-6xl text-[#92c99b]/30 mb-4">
              store
            </span>
            <p className="text-[#92c99b]">
              Aún no hay supermercados. Escanea tickets de la compra para que
              aparezcan aquí.
            </p>
            <a
              href="/scanner"
              className="mt-6 inline-flex items-center gap-2 bg-[#13ec37] text-[#102213] font-bold py-3 px-6 rounded-xl ios-button"
            >
              <span className="material-symbols-outlined">receipt_long</span>
              Ir al escáner
            </a>
          </div>
        ) : (
          <ul className="space-y-3">
            {supermarkets.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => setSelected(name)}
                  className="w-full flex items-center gap-4 rounded-xl bg-[#19331e] border border-[#13ec37]/20 px-4 py-4 text-left ios-button hover:border-[#13ec37]/40 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#234829] flex items-center justify-center text-[#13ec37] flex-shrink-0">
                    <span className="material-symbols-outlined text-2xl">
                      {getStoreIcon(name)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white">{name}</p>
                    <p className="text-sm text-[#92c99b]">
                      Ver artículos comprados
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-[#92c99b]/60 flex-shrink-0">
                    chevron_right
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
