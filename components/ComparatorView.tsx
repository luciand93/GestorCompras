"use client";

import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp, ShoppingCart, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getShoppingListWithPrices } from "@/app/actions/prices";
import { cn } from "@/lib/utils";
import type { ShoppingListItem } from "@/lib/supabase";
import type { Price } from "@/lib/supabase";

interface ItemWithPrices extends ShoppingListItem {
  prices: Price[];
}

export function ComparatorView() {
  const [items, setItems] = useState<ItemWithPrices[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const { data, error, isDemo: demoMode } = await getShoppingListWithPrices();
    if (!error && data) {
      setItems(data);
      setIsDemo(demoMode || false);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getBestPrice = (prices: Price[]) => {
    if (prices.length === 0) return null;
    return prices.reduce((best, current) =>
      current.price < best.price ? current : best
    );
  };

  const getLatestPrice = (prices: Price[]) => {
    if (prices.length === 0) return null;
    return [...prices].sort(
      (a, b) =>
        new Date(b.date_recorded).getTime() -
        new Date(a.date_recorded).getTime()
    )[0];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Cargando comparaciones...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-24">
      {/* Aviso modo demo */}
      {isDemo && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-400">Modo Demo</p>
                <p className="text-sm text-amber-600 dark:text-amber-500">
                  Mostrando precios de ejemplo. Configura Supabase para datos reales.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {items.length === 0 && (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <ShoppingCart className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-2">
              No hay productos en tu lista
            </p>
            <p className="text-sm text-muted-foreground">
              Añade productos a tu lista para ver comparaciones de precios
            </p>
          </CardContent>
        </Card>
      )}

      {items.map((item) => {
        const bestPrice = getBestPrice(item.prices);
        const latestPrice = getLatestPrice(item.prices);
        const hasMultiplePrices = item.prices.length > 1;

        return (
          <Card key={item.id} className="shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 pb-3">
              <CardTitle className="text-lg">{item.product_name}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {item.prices.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    No hay precios registrados para este producto
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Escanea un ticket para añadir precios
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Mejor precio */}
                  {bestPrice && (
                    <div
                      className={cn(
                        "p-4 rounded-xl border-2",
                        "border-green-500/50 bg-green-50 dark:bg-green-950/30"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-green-500/20">
                            <TrendingDown className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                              {hasMultiplePrices ? "Mejor precio" : "Último precio"}
                            </p>
                            <p className="text-xs text-green-600/80 dark:text-green-500/80">
                              {bestPrice.supermarket_name} • {formatDate(bestPrice.date_recorded)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">
                            {bestPrice.price.toFixed(2)}€
                          </p>
                          {bestPrice.unit_price && bestPrice.unit_price !== bestPrice.price && (
                            <p className="text-xs text-green-600/70">
                              {bestPrice.unit_price.toFixed(2)}€/kg
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Comparación si hay múltiples precios */}
                  {hasMultiplePrices &&
                    bestPrice &&
                    latestPrice &&
                    bestPrice.id !== latestPrice.id && (
                      <div className="flex items-center gap-2 text-sm p-3 bg-muted/50 rounded-lg">
                        {bestPrice.price < latestPrice.price ? (
                          <>
                            <TrendingDown className="h-4 w-4 text-green-600" />
                            <span className="text-green-600 font-semibold">
                              Ahorra {(latestPrice.price - bestPrice.price).toFixed(2)}€
                            </span>
                            <span className="text-muted-foreground">
                              comprando en {bestPrice.supermarket_name}
                            </span>
                          </>
                        ) : (
                          <>
                            <TrendingUp className="h-4 w-4 text-orange-600" />
                            <span className="text-orange-600 font-semibold">
                              +{(bestPrice.price - latestPrice.price).toFixed(2)}€
                            </span>
                            <span className="text-muted-foreground">
                              vs tu última compra
                            </span>
                          </>
                        )}
                      </div>
                    )}

                  {/* Todos los precios disponibles */}
                  {item.prices.length > 1 && (
                    <div className="pt-3 border-t">
                      <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                        Comparar supermercados
                      </p>
                      <div className="space-y-2">
                        {[...item.prices]
                          .sort((a, b) => a.price - b.price)
                          .map((price, index) => (
                            <div
                              key={price.id}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-lg",
                                index === 0
                                  ? "bg-green-50 dark:bg-green-950/20"
                                  : "bg-muted/30"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                    index === 0
                                      ? "bg-green-500 text-white"
                                      : "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {index + 1}
                                </span>
                                <span className={cn(
                                  "font-medium",
                                  index === 0 ? "text-green-700 dark:text-green-400" : ""
                                )}>
                                  {price.supermarket_name}
                                </span>
                              </div>
                              <span
                                className={cn(
                                  "font-bold text-lg",
                                  index === 0 ? "text-green-600" : ""
                                )}
                              >
                                {price.price.toFixed(2)}€
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
