"use client";

import { useEffect, useState, useCallback } from "react";
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
import type { ShoppingListItem } from "@/lib/supabase";

export function ShoppingList() {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentProducts, setRecentProducts] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    const { data, error, isDemo: demoMode } = await getShoppingList();
    if (!error && data) {
      setItems(data);
      setIsDemo(demoMode || false);
    }
    setLoading(false);
  };

  const loadRecentProducts = async () => {
    const recent = await getRecentProducts();
    setRecentProducts(recent);
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

  const handleInputChange = (value: string) => {
    setNewItemName(value);
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
    if (!isDemo) await loadItems();
  };

  const handleDeleteItem = async (id: string) => {
    setItems(items.filter(item => item.id !== id));
    await deleteItem(id);
    if (!isDemo) await loadItems();
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
    const { error } = await addToShoppingList(productName, 1);
    if (!error) await loadItems();
  };

  const checkedItems = items.filter((item) => item.is_checked);
  const pendingItems = items.filter((item) => !item.is_checked);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-primary animate-pulse">shopping_cart</span>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Demo warning */}
      {isDemo && (
        <div className="mx-4 mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700/50">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-600">warning</span>
            <div>
              <p className="font-semibold text-amber-700 dark:text-amber-400">Modo Demo</p>
              <p className="text-sm text-amber-600 dark:text-amber-500">Configura Supabase para guardar datos</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick add chips */}
      {recentProducts.length > 0 && pendingItems.length < 3 && (
        <div className="px-4 mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Añadir rápido</p>
          <div className="flex flex-wrap gap-2">
            {recentProducts.slice(0, 5).map((product) => (
              <button
                key={product}
                onClick={() => handleQuickAdd(product)}
                className="px-3 py-1.5 text-sm bg-white dark:bg-card border border-slate-200 dark:border-white/10 rounded-full hover:border-primary hover:text-primary transition-colors ios-button"
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
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive transition-colors"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
              Nueva lista
            </button>
          </div>
        )}

        {/* Pending section */}
        {pendingItems.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pendientes</h3>
              <span className="text-xs text-muted-foreground">{pendingItems.length} artículos</span>
            </div>
            <div className="ios-card divide-y divide-slate-100 dark:divide-white/5">
              {pendingItems.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4 active:bg-slate-50 dark:active:bg-white/5 transition-colors">
                  <input
                    type="checkbox"
                    checked={item.is_checked}
                    onChange={() => handleToggleChecked(item.id, item.is_checked)}
                    className="ios-checkbox"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[17px] font-medium leading-snug truncate">{item.product_name}</p>
                    {item.quantity > 1 && (
                      <p className="text-sm text-muted-foreground">{item.quantity} unidades</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="text-slate-300 hover:text-destructive transition-colors p-1"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Completed section */}
        {checkedItems.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Completados</h3>
              <span className="text-xs text-muted-foreground">{checkedItems.length} artículos</span>
            </div>
            <div className="ios-card divide-y divide-slate-100 dark:divide-white/5">
              {checkedItems.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4 opacity-60">
                  <input
                    type="checkbox"
                    checked={item.is_checked}
                    onChange={() => handleToggleChecked(item.id, item.is_checked)}
                    className="ios-checkbox"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[17px] font-medium line-through text-slate-400 truncate">{item.product_name}</p>
                    {item.quantity > 1 && (
                      <p className="text-sm text-slate-400">{item.quantity} unidades</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="text-slate-300 p-1"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {items.length === 0 && (
          <div className="ios-card py-16 px-6 text-center">
            <span className="material-symbols-outlined text-6xl text-muted-foreground/30 mb-4">shopping_bag</span>
            <p className="text-lg font-semibold text-muted-foreground mb-2">Tu lista está vacía</p>
            <p className="text-sm text-muted-foreground mb-6">Añade productos para empezar</p>
            <button
              onClick={() => setShowAddDialog(true)}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold py-3 px-6 rounded-xl ios-button"
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
          {/* Add button */}
          <button
            onClick={() => setShowAddDialog(true)}
            className="pointer-events-auto flex items-center gap-2 bg-secondary text-white font-semibold py-3 px-5 rounded-full shadow-lg ios-button"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            <span>Añadir</span>
          </button>
          
          {/* Finalize button */}
          {checkedItems.length > 0 && (
            <button
              onClick={handleFinalizePurchase}
              className="pointer-events-auto w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold text-[17px] py-4 rounded-2xl shadow-xl glow-primary ios-button"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_cart_checkout</span>
              <span>Finalizar Compra ({checkedItems.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Add Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddDialog(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl safe-area-bottom">
            <button className="flex h-8 w-full items-center justify-center" onClick={() => setShowAddDialog(false)}>
              <div className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-white/20"></div>
            </button>
            <div className="px-6 pb-6">
              <h2 className="text-xl font-bold mb-4">Añadir Producto</h2>
              
              <div className="relative mb-4">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">search</span>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                  placeholder="Buscar o escribir producto..."
                  className="w-full pl-10 pr-4 py-3 text-lg border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
                
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-white dark:bg-card rounded-xl shadow-lg border border-slate-200 dark:border-white/10 overflow-hidden">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectSuggestion(s)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 border-b last:border-b-0 border-slate-100 dark:border-white/5"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!showSuggestions && recentProducts.length > 0 && !newItemName && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Recientes:</p>
                  <div className="flex flex-wrap gap-2">
                    {recentProducts.slice(0, 6).map((p) => (
                      <button
                        key={p}
                        onClick={() => setNewItemName(p)}
                        className="px-3 py-1.5 text-sm bg-slate-100 dark:bg-white/10 rounded-full"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">Cantidad</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setNewItemQuantity(Math.max(1, newItemQuantity - 1))}
                    className="w-12 h-12 rounded-xl border border-slate-200 dark:border-white/10 text-xl font-bold hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
                    min="1"
                    className="flex-1 px-4 py-3 text-lg text-center border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-white/5"
                  />
                  <button
                    onClick={() => setNewItemQuantity(newItemQuantity + 1)}
                    className="w-12 h-12 rounded-xl border border-slate-200 dark:border-white/10 text-xl font-bold hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddDialog(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddItem}
                  disabled={!newItemName.trim()}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50 ios-button"
                >
                  Añadir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear Dialog */}
      {showClearDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowClearDialog(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-card rounded-2xl shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-2">¿Vaciar lista?</h2>
            <p className="text-muted-foreground mb-6">
              Se eliminarán {items.length} productos. Los precios guardados se mantendrán.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearDialog(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 py-3 rounded-xl bg-destructive text-white font-bold ios-button"
              >
                Vaciar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
