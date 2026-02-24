"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  getShoppingList,
  addToShoppingList,
  toggleItemChecked,
  deleteItem,
  clearCheckedItems,
  clearAllItems,
} from "@/app/actions/shopping-list";
import { searchProducts, getRecentProducts } from "@/app/actions/products";
import { getAllProducts } from "@/app/actions/prices";
import { parseVoiceShoppingList } from "@/app/actions/voice-parser";
import { ListComparison } from "./ListComparison";
import type { ShoppingListItem as IShoppingListItem } from "@/lib/supabase";
import { ShoppingListItem } from "./ShoppingListItem";
import { getCategoryForProduct } from "@/utils/category";
import { hapticFeedback } from "@/utils/haptics";
import { motion, AnimatePresence } from "framer-motion";

export function ShoppingList() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<IShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentProducts, setRecentProducts] = useState<string[]>([]);
  const [motherArticles, setMotherArticles] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);

  const loadItems = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const { data, error, isDemo: demoMode } = await getShoppingList();
    if (!error && data) {
      setItems(data);
      setIsDemo(demoMode || false);
    }
    if (showLoading) setLoading(false);
  };

  const loadRecentProducts = async () => {
    const recent = await getRecentProducts();
    setRecentProducts(recent);
    const { data: allProducts } = await getAllProducts();
    if (allProducts && Array.isArray(allProducts)) {
      setMotherArticles(allProducts.map((p: any) => p.name));
    }
  };

  useEffect(() => {
    loadItems();
    loadRecentProducts();
  }, []);

  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const searchForSuggestions = useCallback(
    debounce(async (query: string) => {
      if (query.length >= 2) {
        const results = await searchProducts(query);
        setSuggestions(results);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300),
    []
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const isDeleting = (e.nativeEvent as any).inputType === "deleteContentBackward" || (e.nativeEvent as any).inputType === "deleteWordBackward";

    setNewItemName(value);

    if (value.length > 0 && !isDeleting) {
      const match = motherArticles.find(m => m.toLowerCase().startsWith(value.toLowerCase()));
      if (match) {
        setNewItemName(match);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(value.length, match.length);
          }
        }, 0);
        return;
      }
    }

    searchForSuggestions(value);
  };

  const handleSelectSuggestion = (name: string) => {
    setNewItemName(name);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) return;
    const { error } = await addToShoppingList(newItemName.trim(), newItemQuantity);
    if (!error) {
      setNewItemName("");
      setNewItemQuantity(1);
      setSuggestions([]);
      setShowAddDialog(false);
      await loadItems();
      await loadRecentProducts();
    }
  };

  const handleToggleChecked = async (id: string, currentChecked: boolean) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, is_checked: !currentChecked } : item
    ));
    await toggleItemChecked(id, !currentChecked);
    if (!isDemo) await loadItems(false);
  };

  const handleDeleteItem = async (id: string) => {
    setItems(items.filter(item => item.id !== id));
    await deleteItem(id);
    if (!isDemo) await loadItems(false);
  };

  const handleFinalizePurchase = async () => {
    const { error } = await clearCheckedItems();
    if (!error) {
      if (isDemo) {
        setItems(items.filter(item => !item.is_checked));
      } else {
        await loadItems();
      }
      window.location.href = "/scanner";
    }
  };

  const handleClearAll = async () => {
    const { error } = await clearAllItems();
    if (!error) {
      if (isDemo) setItems([]);
      else await loadItems();
      setShowClearDialog(false);
    }
  };

  const handleQuickAdd = async (productName: string) => {
    hapticFeedback.light();
    const { error } = await addToShoppingList(productName, 1);
    if (!error) await loadItems();
  };

  const startListening = () => {
    try {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Tu navegador no soporta reconocimiento de voz nativo. Usa Chrome o Safari.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        setVoiceProcessing(true);

        const result = await parseVoiceShoppingList(transcript);
        if (result.items && result.items.length > 0) {
          hapticFeedback.success();
          for (const item of result.items) {
            await addToShoppingList(item.name, item.quantity);
          }
          await loadItems();
          await loadRecentProducts();
        } else if (result.error) {
          hapticFeedback.error();
          alert('Error: ' + result.error);
        }
        setVoiceProcessing(false);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech error", event);
        setIsListening(false);
        setVoiceProcessing(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
      setVoiceProcessing(false);
    }
  };

  const checkedItems = items.filter((item) => item.is_checked);
  const pendingItems = items.filter((item) => !item.is_checked);

  // Group pending items by category
  const groupedPending: Record<string, IShoppingListItem[]> = {};
  pendingItems.forEach(item => {
    const cat = getCategoryForProduct(item.product_name);
    if (!groupedPending[cat]) groupedPending[cat] = [];
    groupedPending[cat].push(item);
  });

  const handleAddQuantity = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (item) {
      setItems(items.map(it => it.id === id ? { ...it, quantity: it.quantity + 1 } : it));
      await addToShoppingList(item.product_name, 1); // addToShoppingList basically updates quantity if exists
      loadItems(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 px-4 py-8 animate-in fade-in">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-[#18181b] rounded-xl h-20 w-full animate-pulse border border-[#10b981]/5 flex items-center px-4 gap-4">
            <div className="w-6 h-6 rounded-full bg-zinc-800"></div>
            <div className="flex flex-col gap-2 w-full">
              <div className="h-4 w-3/4 bg-zinc-800 rounded"></div>
              <div className="h-3 w-1/3 bg-zinc-800 rounded"></div>
            </div>
          </div>
        ))}
        <p className="text-center text-[#a1a1aa]/50 mt-4 text-sm font-medium">Sincronizando mágicamente...</p>
      </div>
    );
  }

  return (
    <>
      {/* Demo warning */}
      {isDemo && (
        <div className="mx-4 mb-4 p-4 bg-amber-500/10 rounded-xl border border-amber-500/30">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-500">warning</span>
            <div>
              <p className="font-semibold text-amber-400">Modo Demo</p>
              <p className="text-sm text-amber-500/80">Configura Supabase para guardar datos</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick add chips */}
      {recentProducts.length > 0 && pendingItems.length < 3 && (
        <div className="px-4 mb-4">
          <p className="text-xs font-semibold text-[#a1a1aa]/60 uppercase tracking-wider mb-2 px-1">Añadir rápido</p>
          <div className="flex flex-wrap gap-2">
            {recentProducts.slice(0, 5).map((product) => (
              <button
                key={product}
                onClick={() => handleQuickAdd(product)}
                className="px-3 py-1.5 text-sm bg-[#18181b] border border-[#10b981]/20 rounded-full hover:border-[#10b981] hover:text-[#10b981] transition-colors ios-button text-white"
              >
                + {product}
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="px-4 pb-48">
        {/* Clear list button */}
        {items.length > 0 && (
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setShowClearDialog(true)}
              className="flex items-center gap-1 text-sm text-[#a1a1aa]/60 hover:text-red-400 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
              Nueva lista
            </button>
          </div>
        )}

        {/* Pending section Grouped */}
        {Object.keys(groupedPending).length > 0 && (
          <section className="mb-6">
            {Object.entries(groupedPending).map(([cat, catsItems]) => (
              <div key={cat} className="mb-4">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-xs font-black text-[#10b981] uppercase tracking-wider">{cat}</h3>
                  <span className="text-xs text-[#a1a1aa] font-medium">{catsItems.length} artículos</span>
                </div>
                <div className="bg-[#18181b] rounded-xl border border-[#10b981]/10 flex flex-col overflow-hidden">
                  <AnimatePresence initial={false}>
                    {catsItems.map((item) => (
                      <ShoppingListItem
                        key={item.id}
                        item={item}
                        onToggle={handleToggleChecked}
                        onDelete={handleDeleteItem}
                        onAddQuantity={handleAddQuantity}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Completed section */}
        {checkedItems.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-semibold text-[#a1a1aa]/60 uppercase tracking-wider">Completados</h3>
              <span className="text-xs text-[#a1a1aa]/40">{checkedItems.length} artículos</span>
            </div>
            <div className="bg-[#18181b]/50 rounded-xl overflow-hidden border border-[#10b981]/5 flex flex-col">
              <AnimatePresence>
                {checkedItems.map((item) => (
                  <ShoppingListItem
                    key={item.id}
                    item={item}
                    onToggle={handleToggleChecked}
                    onDelete={handleDeleteItem}
                  />
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* Empty state */}
        {items.length === 0 && (
          <div className="bg-[#18181b] rounded-xl border border-[#10b981]/10 py-16 px-6 text-center">
            <span className="material-symbols-outlined text-6xl text-[#a1a1aa]/20 mb-4">shopping_bag</span>
            <p className="text-lg font-semibold text-[#a1a1aa]/60 mb-2">Tu lista está vacía</p>
            <p className="text-sm text-[#a1a1aa]/40 mb-6">Añade productos para empezar</p>
            <button
              onClick={() => setShowAddDialog(true)}
              className="inline-flex items-center gap-2 bg-[#10b981] text-[#09090b] font-bold py-3 px-6 rounded-xl ios-button"
            >
              <span className="material-symbols-outlined">add</span>
              Añadir producto
            </button>
          </div>
        )}
      </main>

      {/* Floating buttons */}
      <div className="fixed bottom-24 left-0 right-0 px-4 flex flex-col items-end gap-3 pointer-events-none z-40">
        <div className="max-w-md mx-auto w-full flex flex-col items-end gap-3">
          {/* Speed Dial Actions */}
          <AnimatePresence>
            {speedDialOpen && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.8 }}
                className="flex flex-col gap-3 w-full items-end pb-3 blur-backdrop"
              >
                <button
                  onClick={() => { setSpeedDialOpen(false); startListening(); }}
                  disabled={isListening || voiceProcessing}
                  className={`pointer-events-auto flex w-48 items-center justify-between font-semibold h-12 px-5 rounded-full shadow-lg transition-all ${isListening ? 'bg-red-500 text-white animate-pulse scale-105' : 'bg-[#18181b] text-[#10b981] border border-[#10b981]/30 hover:bg-[#10b981]/10'}`}
                >
                  <span>{isListening ? 'Escuchando...' : 'IA por Voz'}</span>
                  <span className="material-symbols-outlined text-xl">{isListening ? 'graphic_eq' : 'mic'}</span>
                </button>
                <button
                  onClick={() => { setSpeedDialOpen(false); setShowAddDialog(true); }}
                  className="pointer-events-auto flex w-48 items-center justify-between bg-blue-500 text-white font-semibold h-12 px-5 rounded-full shadow-lg"
                >
                  <span>Escritura manual</span>
                  <span className="material-symbols-outlined text-xl">keyboard</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main FAB directly replaces to open dial */}
          <div className="flex w-full justify-end">
            <button
              onClick={() => { hapticFeedback.light(); setSpeedDialOpen(!speedDialOpen); }}
              className={`pointer-events-auto flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all duration-300 ${speedDialOpen ? 'bg-zinc-800 text-white border border-white/20 rotate-45' : 'bg-[#10b981] text-[#09090b]'}`}
            >
              <span className="material-symbols-outlined text-3xl font-light">add</span>
            </button>
          </div>

          {/* Compare button */}
          {pendingItems.length > 0 && (
            <button
              onClick={() => setShowComparison(true)}
              className="pointer-events-auto w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-2xl border border-purple-400/30 ios-button shadow-[0_0_15px_rgba(147,51,234,0.3)]"
            >
              <span className="material-symbols-outlined text-xl">auto_awesome</span>
              <span>Calculadora del Ahorro Invisible</span>
            </button>
          )}

          {/* Finalize button */}
          {checkedItems.length > 0 && (
            <button
              onClick={handleFinalizePurchase}
              className="pointer-events-auto w-full flex items-center justify-center gap-2 bg-[#10b981] text-[#09090b] font-bold text-[17px] py-4 rounded-2xl shadow-xl ios-button"
              style={{ boxShadow: '0 0 20px rgba(19, 236, 55, 0.3)' }}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_cart_checkout</span>
              <span>Finalizar Compra ({checkedItems.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Add Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowAddDialog(false)} />
          <div className="relative w-full max-w-md bg-[#09090b] rounded-2xl shadow-2xl border border-[#10b981]/20 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#09090b] p-4 border-b border-[#10b981]/10 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Añadir Producto</h2>
              <button onClick={() => setShowAddDialog(false)} className="text-[#a1a1aa] p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4">

              <div className="relative mb-4">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]/60">search</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={newItemName}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                  placeholder="Buscar o escribir producto..."
                  className="w-full pl-10 pr-4 py-3 text-lg border border-[#10b981]/20 rounded-xl bg-[#18181b] text-white placeholder:text-[#a1a1aa]/40 focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                  autoFocus
                />

                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-[#18181b] rounded-xl shadow-lg border border-[#10b981]/20 overflow-hidden">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectSuggestion(s)}
                        className="w-full px-4 py-3 text-left text-white hover:bg-[#10b981]/10 border-b last:border-b-0 border-[#10b981]/10"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!showSuggestions && !newItemName && (
                <div className="mb-4 max-h-[40vh] overflow-y-auto pr-1">
                  {recentProducts.length > 0 && (
                    <div className="mb-5">
                      <p className="text-sm font-medium text-[#a1a1aa]/60 mb-2">Añadidos recientemente:</p>
                      <div className="flex flex-wrap gap-2">
                        {recentProducts.slice(0, 6).map((p) => (
                          <button
                            key={p}
                            onClick={() => setNewItemName(p)}
                            className="px-3 py-1.5 text-sm bg-[#10b981]/10 text-white rounded-full border border-[#10b981]/20 hover:bg-[#10b981]/20 transition-colors"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {motherArticles.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-[#a1a1aa]/60 mb-2">Catálogo de Artículos:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {motherArticles.map((p, i) => (
                          <button
                            key={i}
                            onClick={() => setNewItemName(p)}
                            className="px-3 py-2 text-sm bg-white/5 hover:bg-white/10 text-white rounded-lg text-left line-clamp-1 transition-colors"
                            title={p}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block text-[#a1a1aa]/60">Cantidad</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setNewItemQuantity(Math.max(1, newItemQuantity - 1))}
                    className="w-12 h-12 rounded-xl border border-[#10b981]/20 text-xl font-bold text-white hover:bg-[#10b981]/10"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
                    min="1"
                    className="flex-1 px-4 py-3 text-lg text-center border border-[#10b981]/20 rounded-xl bg-[#18181b] text-white"
                  />
                  <button
                    onClick={() => setNewItemQuantity(newItemQuantity + 1)}
                    className="w-12 h-12 rounded-xl border border-[#10b981]/20 text-xl font-bold text-white hover:bg-[#10b981]/10"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Botón grande y visible */}
              <button
                onClick={handleAddItem}
                disabled={!newItemName.trim()}
                className="w-full py-4 rounded-xl bg-[#10b981] text-[#09090b] font-bold text-lg disabled:opacity-50 ios-button shadow-lg flex items-center justify-center gap-2"
                style={{ boxShadow: '0 0 20px rgba(19, 236, 55, 0.3)' }}
              >
                <span className="material-symbols-outlined">add_circle</span>
                Añadir a la lista
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Dialog */}
      {showClearDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowClearDialog(false)} />
          <div className="relative w-full max-w-sm bg-[#09090b] rounded-2xl shadow-2xl border border-[#10b981]/10 p-6">
            <h2 className="text-xl font-bold mb-2 text-white">¿Vaciar lista?</h2>
            <p className="text-[#a1a1aa]/60 mb-6">
              Se eliminarán {items.length} productos. Los precios guardados se mantendrán.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearDialog(false)}
                className="flex-1 py-3 rounded-xl border border-[#10b981]/20 font-semibold text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold ios-button"
              >
                Vaciar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {showComparison && (
        <ListComparison onClose={() => setShowComparison(false)} />
      )}

      {/* Listening Overlay */}
      {isListening && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center p-4 animate-in fade-in">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-32 h-32 bg-red-500/20 rounded-full animate-ping"></div>
            <div className="absolute w-24 h-24 bg-red-500/40 rounded-full animate-pulse"></div>
            <span className="material-symbols-outlined text-6xl text-red-500 relative z-10" style={{ fontVariationSettings: "'FILL' 1" }}>mic</span>
          </div>
          <p className="text-red-500 font-bold text-xl mt-8 text-center">Escuchando...</p>
          <p className="text-[#a1a1aa]/60 text-sm mt-2 text-center">Habla ahora para recoger los productos</p>
        </div>
      )}

      {/* Voice Processing Overlay */}
      {voiceProcessing && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center p-4 animate-in fade-in">
          <span className="material-symbols-outlined text-6xl text-[#10b981] animate-pulse">model_training</span>
          <p className="text-[#10b981] font-bold text-xl mt-6 text-center">Analizando tu voz con IA...</p>
          <p className="text-[#a1a1aa]/60 text-sm mt-2 text-center">Convirtiendo a productos de la compra</p>
        </div>
      )}
    </>
  );
}
