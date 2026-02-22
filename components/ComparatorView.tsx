"use client";

import { useEffect, useState } from "react";
import { getCatalogData, MotherArticle, updateMotherArticleName, deleteMotherArticle, updateAliasName, deleteAlias, updatePrice, deletePrice } from "@/app/actions/catalog";

const storeIcons: Record<string, string> = {
  mercadona: "storefront",
  carrefour: "local_mall",
  lidl: "shopping_bag",
  aldi: "store",
  dia: "shopping_basket",
  default: "store",
};

export function ComparatorView() {
  const [articles, setArticles] = useState<MotherArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<MotherArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Estados de edición en línea
  const [editingMotherId, setEditingMotherId] = useState<string | null>(null);
  const [motherEditVal, setMotherEditVal] = useState("");

  const [editingAliasId, setEditingAliasId] = useState<string | null>(null);
  const [aliasEditVal, setAliasEditVal] = useState("");

  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceEditVal, setPriceEditVal] = useState("");

  const loadData = async () => {
    setLoading(true);
    const result = await getCatalogData();
    if (result.success && result.data) {
      setArticles(result.data);
      setFilteredArticles(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredArticles(articles);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredArticles(articles.filter(a => a.name.toLowerCase().includes(q)));
    }
  }, [searchQuery, articles]);

  const getStoreIcon = (store: string) => {
    const key = store.toLowerCase().replace(/\s+/g, '');
    for (const [name, icon] of Object.entries(storeIcons)) {
      if (key.includes(name)) return icon;
    }
    return storeIcons.default;
  };

  // Acciones sobre Artículo Madre
  const handleEditMother = (id: string, currentName: string) => {
    setEditingMotherId(id);
    setMotherEditVal(currentName);
  };
  const saveMother = async (id: string) => {
    if (!motherEditVal.trim()) return;
    await updateMotherArticleName(id, motherEditVal.trim());
    setEditingMotherId(null);
    loadData();
  };
  const removeMother = async (id: string) => {
    if (!confirm("¿Borrar por completo el artículo madre y todos sus precios/alias?")) return;
    await deleteMotherArticle(id);
    loadData();
  };

  // Acciones sobre Alias
  const handleEditAlias = (id: string, currentName: string) => {
    setEditingAliasId(id);
    setAliasEditVal(currentName);
  };
  const saveAlias = async (id: string) => {
    if (!aliasEditVal.trim()) return;
    await updateAliasName(id, aliasEditVal.trim());
    setEditingAliasId(null);
    loadData();
  };
  const removeAlias = async (id: string) => {
    if (!confirm("¿Borrar este alias?")) return;
    await deleteAlias(id);
    loadData();
  };

  // Acciones sobre Precios
  const handleEditPrice = (id: string, currentVal: number) => {
    setEditingPriceId(id);
    setPriceEditVal(String(currentVal));
  };
  const savePrice = async (id: string) => {
    const p = parseFloat(priceEditVal);
    if (isNaN(p) || p < 0) return;
    await updatePrice(id, p);
    setEditingPriceId(null);
    loadData();
  };
  const removePrice = async (id: string) => {
    if (!confirm("¿Borrar este precio histórico?")) return;
    await deletePrice(id);
    loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-[#10b981] animate-pulse">analytics</span>
          <p className="text-[#a1a1aa]">Cargando catálogo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#09090b]/80 ios-blur border-b border-white/10">
        <div className="flex items-center justify-between p-4 max-w-md mx-auto">
          <h2 className="text-lg font-bold">Catálogo y Comparador</h2>
        </div>

        {/* Buscador */}
        <div className="px-4 pb-4 max-w-md mx-auto">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]/60">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar artículo..."
              className="w-full pl-10 pr-4 py-3 bg-[#18181b] border border-[#10b981]/20 rounded-xl text-white placeholder:text-[#a1a1aa]/40 focus:outline-none focus:ring-2 focus:ring-[#10b981]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]/60"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-6">
        {filteredArticles.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-5xl text-[#a1a1aa]/30 mb-4">search_off</span>
            <p className="text-[#a1a1aa]">No se encontraron artículos.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredArticles.map((article) => {
              const isExpanded = expandedId === article.id;

              return (
                <div key={article.id} className="bg-[#18181b] border border-[#10b981]/20 rounded-xl overflow-hidden shadow-lg transition-all duration-300">
                  {/* Fila del artículo madre (Colapsada/Expandida) */}
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : article.id)}
                  >
                    <div className="flex-1 w-full">
                      {editingMotherId === article.id ? (
                        <div className="flex items-center gap-2 mb-1" onClick={e => e.stopPropagation()}>
                          <input
                            value={motherEditVal}
                            onChange={e => setMotherEditVal(e.target.value)}
                            className="bg-[#09090b] text-white font-bold px-2 py-1 rounded border border-[#10b981]/50 w-full focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                            autoFocus
                          />
                          <button onClick={() => saveMother(article.id)} className="text-[#10b981] shrink-0"><span className="material-symbols-outlined text-xl">check_circle</span></button>
                          <button onClick={() => setEditingMotherId(null)} className="text-red-400 shrink-0"><span className="material-symbols-outlined text-xl">cancel</span></button>
                        </div>
                      ) : (
                        <h3 className="font-bold text-lg leading-tight flex items-center gap-2 mb-1">
                          {article.name}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEditMother(article.id, article.name); }}
                            className="text-white/30 hover:text-white transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                        </h3>
                      )}

                      {!isExpanded && article.bestPrice !== undefined && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[#10b981] font-black">{article.bestPrice.toFixed(2)}€</span>
                          <span className="text-xs text-[#a1a1aa] px-2 py-0.5 rounded-full bg-[#09090b]/80 border border-[#10b981]/30 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">{getStoreIcon(article.bestSupermarket || '')}</span>
                            {article.bestSupermarket}
                          </span>
                        </div>
                      )}
                      {!isExpanded && article.bestPrice === undefined && (
                        <p className="text-xs text-amber-500/70">Sin precios registrados</p>
                      )}
                    </div>

                    <div className="flex flex-col items-end">
                      <button className="text-[#10b981] p-1 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : article.id); }}>
                        <span className={`material-symbols-outlined transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                      </button>
                    </div>
                  </div>

                  {/* Detalle expandido */}
                  {isExpanded && (
                    <div className="bg-[#09090b] px-4 py-5 border-t border-[#10b981]/20 flex flex-col gap-6 slide-in-from-top-2 animate-in">

                      {/* Alias de este artículo */}
                      <div>
                        <h4 className="text-xs font-bold text-[#a1a1aa] uppercase tracking-wider mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">badge</span>
                          Alias en tickets
                        </h4>
                        {article.aliases.length === 0 ? (
                          <p className="text-sm text-white/40 italic px-2">No hay alias registrados.</p>
                        ) : (
                          <ul className="flex flex-col gap-2">
                            {article.aliases.map(al => (
                              <li key={al.id} className="flex flex-col bg-[#18181b] rounded-lg p-3 text-sm border-l-2 border-amber-500/50">
                                {editingAliasId === al.id ? (
                                  <div className="flex items-center gap-2 w-full">
                                    <input
                                      value={aliasEditVal}
                                      onChange={e => setAliasEditVal(e.target.value)}
                                      className="bg-[#09090b] text-amber-400 font-medium px-2 py-1.5 rounded border border-amber-500/50 flex-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                      autoFocus
                                    />
                                    <button onClick={() => saveAlias(al.id)} className="text-[#10b981] active:scale-90 transition-transform"><span className="material-symbols-outlined">check_circle</span></button>
                                  </div>
                                ) : (
                                  <div className="flex items-start justify-between">
                                    <div className="flex flex-col">
                                      <span className="text-amber-400 font-bold mb-0.5">{al.alias_name}</span>
                                      <div className="flex items-center gap-1 text-[11px] text-[#a1a1aa]">
                                        <span className="material-symbols-outlined text-[12px]">{getStoreIcon(al.supermarket_name)}</span>
                                        {al.supermarket_name}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 pt-1">
                                      <button onClick={() => handleEditAlias(al.id, al.alias_name)} className="text-white/40 hover:text-white p-1 transition-colors"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                                      <button onClick={() => removeAlias(al.id)} className="text-red-400/50 hover:text-red-400 p-1 transition-colors"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                    </div>
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Lista de precios identificados */}
                      <div>
                        <h4 className="text-xs font-bold text-[#a1a1aa] uppercase tracking-wider mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">payments</span>
                          Precios
                        </h4>
                        {article.prices.length === 0 ? (
                          <p className="text-sm text-white/40 italic px-2">No hay precios registrados.</p>
                        ) : (
                          <ul className="flex flex-col gap-2">
                            {article.prices.map(pr => {
                              const isBest = pr.price === article.bestPrice;
                              return (
                                <li key={pr.id} className={`flex items-center justify-between rounded-lg p-3 text-sm border-l-2 ${isBest ? 'bg-[#18181b] border-[#10b981]' : 'bg-[#18181b] border-[#a1a1aa]/30 opacity-70'}`}>
                                  <div className="flexflex-col max-w-[50%]">
                                    <div className="flex items-center gap-1.5 font-bold mb-0.5">
                                      <span className="material-symbols-outlined text-lg text-white/50">{getStoreIcon(pr.supermarket_name)}</span>
                                      <span className="truncate">{pr.supermarket_name}</span>
                                    </div>
                                    {isBest && <span className="text-[10px] uppercase font-black bg-[#10b981]/20 text-[#10b981] px-1.5 py-0.5 rounded tracking-wider">Mejor Precio</span>}
                                  </div>

                                  {editingPriceId === pr.id ? (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number" step="0.01"
                                        value={priceEditVal}
                                        onChange={e => setPriceEditVal(e.target.value)}
                                        className="bg-[#09090b] text-[#10b981] font-black w-20 text-right px-2 py-1.5 rounded border border-[#10b981]/50 focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                                        autoFocus
                                      />
                                      <button onClick={() => savePrice(pr.id)} className="text-[#10b981] active:scale-90 transition-transform"><span className="material-symbols-outlined">check_circle</span></button>
                                    </div>
                                  ) : (
                                    <div className="flex items-end gap-3 flex-col sm:flex-row sm:items-center">
                                      <span className={`font-black text-xl ${isBest ? 'text-[#10b981]' : 'text-white'}`}>
                                        {pr.price.toFixed(2)}€
                                      </span>
                                      <div className="flex items-center gap-1 mt-1 sm:mt-0">
                                        <button onClick={() => handleEditPrice(pr.id, pr.price)} className="text-white/40 hover:text-white p-1 transition-colors"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                                        <button onClick={() => removePrice(pr.id)} className="text-red-400/50 hover:text-red-400 p-1 transition-colors"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                      </div>
                                    </div>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>

                      {/* Botón borrar producto completo */}
                      <div className="pt-2">
                        <button
                          onClick={() => removeMother(article.id)}
                          className="w-full py-3 rounded-lg border border-red-500/30 text-red-500 text-sm font-bold bg-red-500/10 flex items-center justify-center gap-2 active:scale-[98%] transition-transform"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete_forever</span>
                          Borrar {article.name} por completo
                        </button>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
