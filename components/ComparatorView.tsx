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
  const [allProducts, setAllProducts] = useState<ProductGroup[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<ProductGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadData() {
      const { data, error } = await getPricesWithHistory();
      
      if (error || !data || data.length === 0) {
        setAllProducts([]);
        setFilteredProducts([]);
      } else {
        const grouped: Record<string, PriceData[]> = {};
        data.forEach((p: PriceData) => {
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

        setAllProducts(productGroups);
        setFilteredProducts(productGroups);
      }
      
      setLoading(false);
    }

    loadData();
  }, []);

  // Filtrar por búsqueda
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts(allProducts);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = allProducts.filter(p => 
        p.productName.toLowerCase().includes(query)
      );
      setFilteredProducts(filtered);
    }
    setSelectedProduct(null);
  }, [searchQuery, allProducts]);

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
      <div className="min-h-screen bg-[#102213] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-[#13ec37] animate-pulse">analytics</span>
          <p className="text-[#92c99b]">Cargando comparador...</p>
        </div>
      </div>
    );
  }

  // Estado vacío
  if (allProducts.length === 0) {
    return (
      <div className="min-h-screen bg-[#102213] text-white pb-24">
        <header className="sticky top-0 z-10 bg-[#102213]/80 ios-blur border-b border-white/10">
          <div className="flex items-center justify-between p-4 max-w-md mx-auto">
            <h2 className="text-lg font-bold">Comparador</h2>
          </div>
        </header>

        <main className="max-w-md mx-auto p-4 mt-8">
          <div className="rounded-xl bg-[#19331e] border border-[#13ec37]/20 py-16 px-6 text-center">
            <span className="material-symbols-outlined text-7xl text-[#92c99b]/20 mb-4">analytics</span>
            <p className="text-xl font-semibold text-white mb-2">Sin datos de precios</p>
            <p className="text-[#92c99b]/60 mb-8">
              Escanea tickets de compra para empezar a comparar precios
            </p>
            <a href="/scanner" className="inline-flex items-center gap-2 bg-[#13ec37] text-[#102213] font-bold py-4 px-8 rounded-xl ios-button">
              <span className="material-symbols-outlined">receipt_long</span>
              Escanear primer ticket
            </a>
          </div>
        </main>
      </div>
    );
  }

  const currentProduct = selectedProduct || (filteredProducts.length > 0 ? filteredProducts[0] : null);

  return (
    <div className="min-h-screen bg-[#102213] text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#102213]/80 ios-blur border-b border-white/10">
        <div className="flex items-center justify-between p-4 max-w-md mx-auto">
          <h2 className="text-lg font-bold">Comparador</h2>
        </div>
        
        {/* Buscador */}
        <div className="px-4 pb-4 max-w-md mx-auto">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#92c99b]/60">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full pl-10 pr-4 py-3 bg-[#19331e] border border-[#13ec37]/20 rounded-xl text-white placeholder:text-[#92c99b]/40 focus:outline-none focus:ring-2 focus:ring-[#13ec37]"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#92c99b]/60"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto">
        {/* Product selector chips */}
        {filteredProducts.length > 1 && (
          <div className="px-4 pt-4">
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {filteredProducts.map((product, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedProduct(product)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ios-button ${
                    currentProduct?.productName === product.productName
                      ? 'bg-[#13ec37] text-[#102213]'
                      : 'bg-[#19331e] text-white border border-white/10'
                  }`}
                >
                  {product.productName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sin resultados de búsqueda */}
        {filteredProducts.length === 0 && searchQuery && (
          <div className="p-4 mt-8 text-center">
            <span className="material-symbols-outlined text-5xl text-[#92c99b]/30 mb-4">search_off</span>
            <p className="text-[#92c99b]">No se encontró "{searchQuery}"</p>
          </div>
        )}

        {currentProduct && (
          <>
            <div className="px-4 pt-6 pb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#13ec37]/70 mb-1">Analizando precios de:</p>
              <h1 className="text-2xl font-black">{currentProduct.productName}</h1>
            </div>

            {/* Best option card */}
            <div className="p-4">
              <div className="rounded-xl shadow-lg bg-[#19331e] border border-[#13ec37]/20 overflow-hidden">
                <div className="relative w-full h-32 bg-gradient-to-br from-[#13ec37]/30 to-emerald-900 flex items-center justify-center">
                  <span className="material-symbols-outlined text-6xl text-[#13ec37]/50">local_offer</span>
                  <div className="absolute top-3 left-3 bg-[#13ec37] text-[#102213] text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter">
                    Mejor Valor
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[#13ec37] text-sm font-bold uppercase">¡LA MEJOR OPCIÓN!</p>
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
                      <span className="h-9 px-4 bg-[#13ec37] text-[#102213] text-sm font-bold rounded-lg flex items-center">
                        Ahorras {(currentProduct.avgPrice - currentProduct.bestPrice.price).toFixed(2)}€
                      </span>
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
                </div>

                <div className="flex flex-col gap-0.5">
                  {currentProduct.prices.slice(1).map((price, index) => {
                    const diff = price.price - currentProduct.bestPrice.price;
                    
                    return (
                      <div key={index} className="flex items-center gap-4 bg-[#112214] px-4 min-h-[80px] py-3 justify-between border-b border-white/5">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-lg bg-[#234829] flex items-center justify-center text-[#13ec37]">
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
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Stats */}
            {currentProduct.prices.length > 1 && (
              <div className="p-4 mt-4">
                <div className="rounded-xl bg-[#19331e] border border-[#13ec37]/20 p-4">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#13ec37]">insights</span>
                    Estadísticas
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-black text-[#13ec37]">{currentProduct.bestPrice.price.toFixed(2)}€</p>
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
            )}
          </>
        )}
      </main>
    </div>
  );
}
