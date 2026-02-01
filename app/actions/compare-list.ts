"use server";

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export interface ProductComparison {
  productName: string;
  quantity: number;
  prices: {
    store: string;
    price: number;
    totalPrice: number;
  }[];
  bestStore: string;
  bestPrice: number;
}

export interface StoreTotal {
  store: string;
  total: number;
  items: { name: string; price: number; quantity: number }[];
}

export interface ComparisonResult {
  products: ProductComparison[];
  bestSingleStore: StoreTotal | null;
  optimizedSplit: StoreTotal[];
  totalSavings: number;
  error?: string;
}

/**
 * Compara todos los productos de la lista y calcula la mejor opción
 */
export async function compareShoppingList(): Promise<ComparisonResult> {
  if (!isSupabaseConfigured() || !supabase) {
    return getDemoComparison();
  }

  try {
    // Obtener lista de compras pendiente
    const { data: shoppingList, error: listError } = await supabase
      .from("shopping_list")
      .select("*")
      .eq("is_checked", false);

    if (listError || !shoppingList || shoppingList.length === 0) {
      return {
        products: [],
        bestSingleStore: null,
        optimizedSplit: [],
        totalSavings: 0,
        error: shoppingList?.length === 0 ? "Tu lista está vacía" : "Error al cargar lista"
      };
    }

    const comparisons: ProductComparison[] = [];

    // Para cada producto en la lista, buscar precios
    for (const item of shoppingList) {
      const productName = item.product_name.toLowerCase();
      
      // Buscar producto por nombre, alias o palabra clave (ej. "leche entera" → "Leche")
      let productIds: string[] = [];
      const { data: products } = await supabase
        .from("products")
        .select("id, name")
        .ilike("name", `%${productName}%`);
      if (products?.length) productIds = products.map((p) => p.id);

      const { data: aliases } = await supabase
        .from("product_aliases")
        .select("product_id")
        .ilike("alias_name", `%${productName}%`);
      if (aliases?.length) {
        productIds = [...new Set([...productIds, ...aliases.map((a) => a.product_id)])];
      }

      // Si no hay match, probar con la primera palabra (ej. "leche entera" → buscar "leche")
      if (productIds.length === 0) {
        const firstWord = productName.split(/\s+/)[0];
        if (firstWord && firstWord.length > 2) {
          const { data: productsByWord } = await supabase
            .from("products")
            .select("id")
            .ilike("name", `%${firstWord}%`);
          if (productsByWord?.length) {
            productIds = productsByWord.map((p) => p.id);
          }
          const { data: aliasesByWord } = await supabase
            .from("product_aliases")
            .select("product_id")
            .ilike("alias_name", `%${firstWord}%`);
          if (aliasesByWord?.length) {
            productIds = [...new Set([...productIds, ...aliasesByWord.map((a) => a.product_id)])];
          }
        }
      }

      if (productIds.length === 0) {
        comparisons.push({
          productName: item.product_name,
          quantity: item.quantity,
          prices: [],
          bestStore: "Sin datos",
          bestPrice: 0
        });
        continue;
      }

      // Obtener precios más recientes por supermercado
      const { data: prices } = await supabase
        .from("prices")
        .select("supermarket_name, price")
        .in("product_id", productIds)
        .order("date_recorded", { ascending: false });

      if (!prices || prices.length === 0) {
        comparisons.push({
          productName: item.product_name,
          quantity: item.quantity,
          prices: [],
          bestStore: "Sin datos",
          bestPrice: 0
        });
        continue;
      }

      // Agrupar por supermercado (precio más reciente)
      const pricesByStore = new Map<string, number>();
      prices.forEach(p => {
        if (!pricesByStore.has(p.supermarket_name)) {
          pricesByStore.set(p.supermarket_name, p.price);
        }
      });

      const priceList = Array.from(pricesByStore.entries()).map(([store, price]) => ({
        store,
        price,
        totalPrice: price * item.quantity
      }));

      priceList.sort((a, b) => a.price - b.price);

      comparisons.push({
        productName: item.product_name,
        quantity: item.quantity,
        prices: priceList,
        bestStore: priceList[0]?.store || "Sin datos",
        bestPrice: priceList[0]?.price || 0
      });
    }

    // Calcular mejor tienda única
    const storeTotals = new Map<string, { total: number; items: { name: string; price: number; quantity: number }[] }>();
    
    comparisons.forEach(comp => {
      comp.prices.forEach(p => {
        if (!storeTotals.has(p.store)) {
          storeTotals.set(p.store, { total: 0, items: [] });
        }
        const storeData = storeTotals.get(p.store)!;
        storeData.total += p.totalPrice;
        storeData.items.push({ name: comp.productName, price: p.price, quantity: comp.quantity });
      });
    });

    const productsWithPrices = comparisons.filter(c => c.prices.length > 0).length;
    
    // Convertir a array para poder ordenar y filtrar
    const storeArray = Array.from(storeTotals.entries())
      .filter(([_, data]) => data.items.length === productsWithPrices)
      .map(([store, data]) => ({
        store,
        total: data.total,
        items: data.items
      }))
      .sort((a, b) => a.total - b.total);
    
    const bestSingleStore: StoreTotal | null = storeArray.length > 0 ? storeArray[0] : null;

    // Calcular split optimizado (mejor precio de cada producto)
    const optimizedMap = new Map<string, { name: string; price: number; quantity: number }[]>();
    let optimizedTotal = 0;

    comparisons.forEach(comp => {
      if (comp.prices.length > 0) {
        const best = comp.prices[0];
        if (!optimizedMap.has(best.store)) {
          optimizedMap.set(best.store, []);
        }
        optimizedMap.get(best.store)!.push({
          name: comp.productName,
          price: best.price,
          quantity: comp.quantity
        });
        optimizedTotal += best.totalPrice;
      }
    });

    const optimizedSplit: StoreTotal[] = Array.from(optimizedMap.entries()).map(([store, items]) => ({
      store,
      items,
      total: items.reduce((sum, i) => sum + (i.price * i.quantity), 0)
    }));

    const totalSavings = bestSingleStore ? bestSingleStore.total - optimizedTotal : 0;

    return {
      products: comparisons,
      bestSingleStore,
      optimizedSplit,
      totalSavings: Math.max(0, totalSavings)
    };

  } catch (error: any) {
    console.error("Error comparing list:", error);
    return {
      products: [],
      bestSingleStore: null,
      optimizedSplit: [],
      totalSavings: 0,
      error: error.message
    };
  }
}

function getDemoComparison(): ComparisonResult {
  return {
    products: [
      {
        productName: "Leche",
        quantity: 2,
        prices: [
          { store: "Lidl", price: 0.89, totalPrice: 1.78 },
          { store: "Mercadona", price: 0.95, totalPrice: 1.90 },
        ],
        bestStore: "Lidl",
        bestPrice: 0.89
      },
      {
        productName: "Pan",
        quantity: 1,
        prices: [
          { store: "Mercadona", price: 1.20, totalPrice: 1.20 },
          { store: "Lidl", price: 1.35, totalPrice: 1.35 },
        ],
        bestStore: "Mercadona",
        bestPrice: 1.20
      }
    ],
    bestSingleStore: {
      store: "Mercadona",
      total: 3.10,
      items: [
        { name: "Leche", price: 0.95, quantity: 2 },
        { name: "Pan", price: 1.20, quantity: 1 }
      ]
    },
    optimizedSplit: [
      {
        store: "Lidl",
        total: 1.78,
        items: [{ name: "Leche", price: 0.89, quantity: 2 }]
      },
      {
        store: "Mercadona",
        total: 1.20,
        items: [{ name: "Pan", price: 1.20, quantity: 1 }]
      }
    ],
    totalSavings: 0.12
  };
}
