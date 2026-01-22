"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Check, Trash2, ShoppingBag, AlertTriangle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  getShoppingList,
  addToShoppingList,
  toggleItemChecked,
  deleteItem,
  clearCheckedItems,
} from "@/app/actions/shopping-list";
import { searchProducts, getRecentProducts } from "@/app/actions/products";
import type { ShoppingListItem } from "@/lib/supabase";

export function ShoppingList() {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
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

  // Debounce para búsqueda
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
    if (!isDemo) {
      await loadItems();
    }
  };

  const handleDeleteItem = async (id: string) => {
    setItems(items.filter(item => item.id !== id));
    await deleteItem(id);
    if (!isDemo) {
      await loadItems();
    }
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

  const handleQuickAdd = async (productName: string) => {
    const { error } = await addToShoppingList(productName, 1);
    if (!error) {
      await loadItems();
    }
  };

  const checkedItems = items.filter((item) => item.is_checked);
  const pendingItems = items.filter((item) => !item.is_checked);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <>
      {/* Aviso modo demo */}
      {isDemo && (
        <Card className="mb-4 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-400">Modo Demo</p>
                <p className="text-sm text-amber-600 dark:text-amber-500">
                  Configura Supabase en .env.local para guardar datos reales.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Productos recientes para añadir rápido */}
      {recentProducts.length > 0 && pendingItems.length < 3 && (
        <Card className="mb-4 bg-muted/30">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">Añadir rápido:</p>
            <div className="flex flex-wrap gap-2">
              {recentProducts.slice(0, 6).map((product) => (
                <button
                  key={product}
                  onClick={() => handleQuickAdd(product)}
                  className="px-3 py-1.5 text-sm bg-background border rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  + {product}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4 mb-32">
        {/* Items pendientes */}
        {pendingItems.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Pendientes ({pendingItems.length})</h2>
            <div className="space-y-2">
              {pendingItems.map((item) => (
                <Card key={item.id} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleChecked(item.id, item.is_checked)}
                        className={cn(
                          "flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all touch-target",
                          item.is_checked
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/30 hover:border-primary hover:scale-110"
                        )}
                      >
                        {item.is_checked && <Check className="h-4 w-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.product_name}</p>
                        {item.quantity > 1 && (
                          <p className="text-sm text-muted-foreground">
                            Cantidad: {item.quantity}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors touch-target p-2"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Items comprados */}
        {checkedItems.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 text-muted-foreground">
              En el carrito ({checkedItems.length})
            </h2>
            <div className="space-y-2">
              {checkedItems.map((item) => (
                <Card key={item.id} className="shadow-sm opacity-70">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleChecked(item.id, item.is_checked)}
                        className="flex-shrink-0 w-7 h-7 rounded-full border-2 border-primary bg-primary text-primary-foreground flex items-center justify-center touch-target"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate line-through text-muted-foreground">
                          {item.product_name}
                        </p>
                        {item.quantity > 1 && (
                          <p className="text-sm text-muted-foreground">
                            Cantidad: {item.quantity}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {items.length === 0 && (
          <Card className="py-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <ShoppingBag className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-2">
                Tu lista está vacía
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Pulsa el botón para añadir productos
              </p>
              <Button onClick={() => setShowAddDialog(true)} size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Añadir producto
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Botón Finalizar Compra */}
        {checkedItems.length > 0 && (
          <div className="fixed bottom-24 left-4 right-24 z-40">
            <Button
              onClick={handleFinalizePurchase}
              className="w-full h-14 text-lg shadow-lg bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <ShoppingBag className="mr-2 h-5 w-5" />
              Finalizar Compra ({checkedItems.length})
            </Button>
          </div>
        )}
      </div>

      {/* Botón flotante para añadir - MEJORADO */}
      <button
        onClick={() => setShowAddDialog(true)}
        className="fixed bottom-24 right-4 z-40 flex items-center gap-2 bg-primary text-primary-foreground px-5 py-4 rounded-full shadow-xl hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
      >
        <Plus className="h-6 w-6" />
        <span className="font-semibold">Añadir</span>
      </button>

      {/* Dialog para añadir item - CON AUTOCOMPLETADO */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) {
          setNewItemName("");
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl">Añadir Producto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <label className="text-sm font-medium mb-2 block">
                Nombre del producto
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={() => newItemName.length >= 2 && setShowSuggestions(true)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                  placeholder="Buscar o escribir producto..."
                  className="w-full pl-10 pr-4 py-3 text-lg border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
              </div>
              
              {/* Sugerencias */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b last:border-b-0"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Productos recientes en el dialog */}
            {!showSuggestions && recentProducts.length > 0 && !newItemName && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Recientes:</p>
                <div className="flex flex-wrap gap-2">
                  {recentProducts.slice(0, 8).map((product) => (
                    <button
                      key={product}
                      onClick={() => setNewItemName(product)}
                      className="px-3 py-1.5 text-sm bg-muted rounded-full hover:bg-muted/80 transition-colors"
                    >
                      {product}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Cantidad</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setNewItemQuantity(Math.max(1, newItemQuantity - 1))}
                  className="w-12 h-12 rounded-lg border text-xl font-bold hover:bg-muted"
                >
                  -
                </button>
                <input
                  type="number"
                  value={newItemQuantity}
                  onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
                  min="1"
                  className="flex-1 px-4 py-3 text-lg text-center border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={() => setNewItemQuantity(newItemQuantity + 1)}
                  className="w-12 h-12 rounded-lg border text-xl font-bold hover:bg-muted"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setShowAddDialog(false)}
                variant="outline"
                className="flex-1 h-12"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleAddItem} 
                className="flex-1 h-12"
                disabled={!newItemName.trim()}
              >
                <Plus className="mr-2 h-5 w-5" />
                Añadir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
