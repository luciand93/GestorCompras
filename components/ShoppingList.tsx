"use client";

import { useEffect, useState } from "react";
import { Plus, Check, Trash2, ShoppingBag, AlertTriangle } from "lucide-react";
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
import type { ShoppingListItem } from "@/lib/supabase";

export function ShoppingList() {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState(1);

  const loadItems = async () => {
    setLoading(true);
    const { data, error, isDemo: demoMode } = await getShoppingList();
    if (!error && data) {
      setItems(data);
      setIsDemo(demoMode || false);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleAddItem = async () => {
    if (!newItemName.trim()) return;

    const { error } = await addToShoppingList(newItemName.trim(), newItemQuantity);
    if (!error) {
      setNewItemName("");
      setNewItemQuantity(1);
      setShowAddDialog(false);
      await loadItems();
    }
  };

  const handleToggleChecked = async (id: string, currentChecked: boolean) => {
    // Actualización optimista para mejor UX
    setItems(items.map(item => 
      item.id === id ? { ...item, is_checked: !currentChecked } : item
    ));
    await toggleItemChecked(id, !currentChecked);
    if (!isDemo) {
      await loadItems();
    }
  };

  const handleDeleteItem = async (id: string) => {
    // Actualización optimista
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

      <div className="space-y-4 mb-24">
        {/* Items pendientes */}
        {pendingItems.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Pendientes</h2>
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
              <p className="text-sm text-muted-foreground">
                Pulsa el botón + para añadir productos
              </p>
            </CardContent>
          </Card>
        )}

        {/* Botón Finalizar Compra */}
        {checkedItems.length > 0 && (
          <div className="fixed bottom-24 left-4 right-20 z-40">
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

      {/* Botón flotante para añadir */}
      <Button
        onClick={() => setShowAddDialog(true)}
        size="lg"
        className="fixed bottom-24 right-4 h-16 w-16 rounded-full shadow-xl z-40 text-2xl"
      >
        <Plus className="h-8 w-8" />
      </Button>

      {/* Dialog para añadir item */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl">Añadir Producto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Nombre del producto
              </label>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                placeholder="Ej: Aceite de oliva"
                className="w-full px-4 py-3 text-lg border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Cantidad</label>
              <input
                type="number"
                value={newItemQuantity}
                onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
                min="1"
                className="w-full px-4 py-3 text-lg border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setShowAddDialog(false)}
                variant="outline"
                className="flex-1 h-12"
              >
                Cancelar
              </Button>
              <Button onClick={handleAddItem} className="flex-1 h-12">
                Añadir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
