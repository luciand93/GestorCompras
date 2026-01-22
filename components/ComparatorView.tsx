"use client";

import { useEffect, useState } from "react";
import { getPricesWithHistory } from "@/app/actions/prices";

interface PriceData {
  product_name: string;
  store: string;
  price: number;
  date: string;
}

interface ProductGroup {
  productName: string;
  prices: PriceData[];
  bestPrice: PriceData;
  avgPrice: number;
}

const storeIcons: Record<string, string> = {
  mercadona: "storefront",
  carrefour: "local_mall",
  lidl: "shopping_bag",
  aldi: "store",
  dia: "shopping_basket",
  default: "store",
};

export function ComparatorView() {
  const [products, setProducts] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<ProductGroup | null>(null);

  useEffect(() => {
    async function loadData() {
      const { data, error } = await getPricesWithHistory();
      
      if (error || !data || data.length === 0) {
        // Demo data
        const demoData: ProductGroup[] = [
          {
            productName: "Aceite de Oliva Virgen Extra 1L",
            prices: [
              { product_name: "Aceite de Oliva Virgen Extra 1L", store: "Supermercado Global", price: 8.45, date: new Date().toISOString() },
              { product_name: "Aceite de Oliva Virgen Extra 1L", store: "Mercado Central", price: 9.20, date: new Date().toISOString() },
              { product_name: "Aceite de Oliva Virgen Extra 1L", store: "Hiper Ahorro", price: 9.80, date: new Date().toISOString() },
              { product_name: "Aceite de Oliva Virgen Extra 1L", store: "Bio Market", price: 10.15, date: new Date().toISOString() },
            ],
            bestPrice: { product_name: "Aceite de Oliva Virgen Extra 1L", store: "Supermercado Global", price: 8.45, date: new Date().toISOString() },
            avgPrice: 9.40
          },
          {
            productName: "Leche Entera 1L",
            prices: [
              { product_name: "Leche Entera 1L", store: "Lidl", price: 0.89, date: new Date().toISOString() },
              { product_name: "Leche Entera 1L", store: "Mercadona", price: 0.95, date: new Date().toISOString() },
              { product_name: "Leche Entera 1L", store: "Carrefour", price: 1.05, date: new Date().toISOString() },
            ],
            bestPrice: { product_name: "Leche Entera 1L", store: "Lidl", price: 0.89, date: new Date().toISOString() },
            avgPrice: 0.96
          },
          {
            productName: "Pan de Molde",
            prices: [
              { product_name: "Pan de Molde", store: "Aldi", price: 1.15, date: new Date().toISOString() },
              { product_name: "Pan de Molde", store: "Día", price: 1.29, date: new Date().toISOString() },
              { product_name: "Pan de Molde", store: "Mercadona", price: 1.35, date: new Date().toISOString() },
            ],
            bestPrice: { product_name: "Pan de Molde", store: "Aldi", price: 1.15, date: new Date().toISOString() },
            avgPrice: 1.26
          }
        ];
        setProducts(demoData);
      } else {
        // Group by product name
        const grouped: Record<string, PriceData[]> = {};
        data.forEach(p => {
          if (!grouped[p.product_name]) grouped[p.product_name] = [];
          grouped[p.product_name].push(p);
        });

        const productGroups: ProductGroup[] = Object.entries(grouped).map(([name, prices]) => {
          const sorted = [...prices].sort((a, b) => a.price - b.price);
          const avg = prices.reduce((sum, p) => sum + p.price, 0) / prices.length;
          return {
            productName: name,
            prices: sorted,
            bestPrice: sorted[0],
            avgPrice: avg
          };
        });

        setProducts(productGroups);
      }
      
      setLoading(false);
    }

    loadData();
  }, []);

  const getStoreIcon = (store: string) => {
    const key = store.toLowerCase().replace(/\s+/g, '');
    for (const [name, icon] of Object.entries(storeIcons)) {
      if (key.includes(name)) return icon;
    }
    return storeIcons.default;
  };

  const formatTimeSince = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const hours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (hours < 1) return "Ahora";
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days}d`;
  };

  if (loading) {
    return (
      <div className="dark min-h-screen bg-[#102213] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-primary animate-pulse">analytics</span>
          <p className="text-[#92c99b]">Cargando comparador...</p>
        </div>
      </div>
    );
  }

  const currentProduct = selectedProduct || products[0];

  return (
    <div className="dark min-h-screen bg-[#102213] text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#102213]/80 ios-blur border-b border-white/10">
        <div className="flex items-center justify-between p-4 max-w-md mx-auto">
          <h2 className="text-lg font-bold">Comparador</h2>
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined cursor-pointer">share</span>
            <span className="material-symbols-outlined cursor-pointer">favorite</span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto">
        {/* Product selector */}
        {products.length > 1 && (
          <div className="px-4 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#92c99b] mb-2">Seleccionar producto:</p>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {products.map((product, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedProduct(product)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ios-button ${
                    currentProduct?.productName === product.productName
                      ? 'bg-primary text-[#102213]'
                      : 'bg-[#19331e] text-white border border-white/10'
                  }`}
                >
                  {product.productName}
                </button>
              ))}
            </div>
          </div>
        )}

        {currentProduct && (
          <>
            {/* Product context */}
            <div className="px-4 pt-6 pb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary/70 mb-1">Analizando precios de:</p>
              <h1 className="text-2xl font-black">{currentProduct.productName}</h1>
            </div>

            {/* Best option card */}
            <div className="p-4">
              <div className="rounded-xl shadow-lg bg-[#19331e] border border-primary/20 overflow-hidden">
                <div className="relative w-full h-40 bg-gradient-to-br from-primary/30 to-emerald-900 flex items-center justify-center">
                  <span className="material-symbols-outlined text-7xl text-primary/50">local_offer</span>
                  <div className="absolute top-3 left-3 bg-primary text-[#102213] text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter">
                    Mejor Valor
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-primary text-sm font-bold uppercase">¡LA MEJOR OPCIÓN!</p>
                      <p className="text-xl font-black">{currentProduct.bestPrice.store}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black">{currentProduct.bestPrice.price.toFixed(2)}€</p>
                      <p className="text-xs text-[#92c99b]">Precio unitario</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 justify-between mt-4">
                    <div className="flex items-center gap-1 text-[#92c99b] text-sm">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      <span>{formatTimeSince(currentProduct.bestPrice.date)}</span>
                    </div>
                    
                    {currentProduct.prices.length > 1 && (
                      <button className="flex items-center justify-center h-9 px-4 bg-primary text-[#102213] text-sm font-bold rounded-lg shadow-md ios-button">
                        Ahorras {(currentProduct.avgPrice - currentProduct.bestPrice.price).toFixed(2)}€
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Other stores */}
            {currentProduct.prices.length > 1 && (
              <>
                <div className="flex items-center justify-between px-4 pb-2 pt-4">
                  <h3 className="text-lg font-bold">Otras tiendas</h3>
                  <span className="text-xs font-bold text-primary cursor-pointer uppercase tracking-widest">Ver más</span>
                </div>

                <div className="flex flex-col gap-0.5">
                  {currentProduct.prices.slice(1).map((price, index) => {
                    const diff = price.price - currentProduct.bestPrice.price;
                    
                    return (
                      <div 
                        key={index} 
                        className="flex items-center gap-4 bg-[#112214] px-4 min-h-[80px] py-3 justify-between border-b border-white/5"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-lg bg-[#234829] flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-2xl">{getStoreIcon(price.store)}</span>
                          </div>
                          <div>
                            <p className="text-base font-bold line-clamp-1">{price.store}</p>
                            <p className="text-[#92c99b] text-sm font-medium mt-1 flex items-center gap-1">
                              {price.price.toFixed(2)}€
                              <span className="text-red-400 text-xs font-bold">(+{diff.toFixed(2)}€)</span>
                            </p>
                          </div>
                        </div>
                        <button className="flex items-center justify-center h-9 px-4 bg-[#234829] text-white text-sm font-bold rounded-lg ios-button active:bg-primary/20">
                          Añadir
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Stats card */}
            <div className="p-4 mt-4">
              <div className="rounded-xl bg-[#19331e] border border-primary/20 p-4">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">insights</span>
                  Estadísticas
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-black text-primary">{currentProduct.bestPrice.price.toFixed(2)}€</p>
                    <p className="text-xs text-[#92c99b]">Mínimo</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black">{currentProduct.avgPrice.toFixed(2)}€</p>
                    <p className="text-xs text-[#92c99b]">Promedio</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-red-400">
                      {Math.max(...currentProduct.prices.map(p => p.price)).toFixed(2)}€
                    </p>
                    <p className="text-xs text-[#92c99b]">Máximo</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {products.length === 0 && (
          <div className="p-4 mt-8">
            <div className="rounded-xl bg-[#19331e] border border-primary/20 py-16 px-6 text-center">
              <span className="material-symbols-outlined text-6xl text-[#92c99b]/30 mb-4">analytics</span>
              <p className="text-lg font-semibold text-[#92c99b] mb-2">Sin datos de precios</p>
              <p className="text-sm text-[#92c99b]/70 mb-6">Escanea tickets para ver comparaciones</p>
              <a
                href="/scanner"
                className="inline-flex items-center gap-2 bg-primary text-[#102213] font-bold py-3 px-6 rounded-xl ios-button"
              >
                <span className="material-symbols-outlined">receipt_long</span>
                Escanear ticket
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
