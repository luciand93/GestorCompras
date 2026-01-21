"use server";

import { supabase, isSupabaseConfigured, Price, ShoppingListItem } from "@/lib/supabase";

// Datos demo de precios
const demoPrices: Record<string, Price[]> = {
  "aceite de oliva virgen extra": [
    {
      id: "price-1",
      product_id: "prod-1",
      supermarket_name: "Mercadona",
      price: 5.99,
      unit_price: 5.99,
      date_recorded: "2026-01-15",
      created_at: "2026-01-15",
    },
    {
      id: "price-2",
      product_id: "prod-1",
      supermarket_name: "Lidl",
      price: 6.49,
      unit_price: 6.49,
      date_recorded: "2026-01-10",
      created_at: "2026-01-10",
    },
    {
      id: "price-3",
      product_id: "prod-1",
      supermarket_name: "Carrefour",
      price: 6.25,
      unit_price: 6.25,
      date_recorded: "2026-01-12",
      created_at: "2026-01-12",
    },
  ],
  "leche entera": [
    {
      id: "price-4",
      product_id: "prod-2",
      supermarket_name: "Mercadona",
      price: 0.89,
      unit_price: 0.89,
      date_recorded: "2026-01-18",
      created_at: "2026-01-18",
    },
    {
      id: "price-5",
      product_id: "prod-2",
      supermarket_name: "Dia",
      price: 0.79,
      unit_price: 0.79,
      date_recorded: "2026-01-17",
      created_at: "2026-01-17",
    },
  ],
  "pan de molde integral": [
    {
      id: "price-6",
      product_id: "prod-3",
      supermarket_name: "Mercadona",
      price: 1.35,
      unit_price: 2.70,
      date_recorded: "2026-01-19",
      created_at: "2026-01-19",
    },
  ],
};

const demoShoppingList: ShoppingListItem[] = [
  {
    id: "demo-1",
    product_name: "Aceite de oliva virgen extra",
    is_checked: false,
    quantity: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-2",
    product_name: "Leche entera",
    is_checked: false,
    quantity: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export async function getProductPrices(productName: string) {
  if (!isSupabaseConfigured() || !supabase) {
    const normalizedName = productName.toLowerCase();
    const prices = demoPrices[normalizedName] || [];
    return { data: prices, error: null, isDemo: true };
  }

  // Buscar producto por nombre
  const { data: product } = await supabase
    .from("products")
    .select("id")
    .ilike("name", productName)
    .limit(1)
    .single();

  if (!product) {
    return { data: [], error: null, isDemo: false };
  }

  // Obtener últimos precios por supermercado
  const { data, error } = await supabase
    .from("prices")
    .select("*")
    .eq("product_id", product.id)
    .order("date_recorded", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching prices:", error);
    return { data: [], error, isDemo: false };
  }

  // Agrupar por supermercado y obtener el precio más reciente
  const pricesBySupermarket = new Map();
  data?.forEach((price) => {
    const key = price.supermarket_name;
    if (!pricesBySupermarket.has(key)) {
      pricesBySupermarket.set(key, price);
    }
  });

  return {
    data: Array.from(pricesBySupermarket.values()),
    error: null,
    isDemo: false,
  };
}

export async function getShoppingListWithPrices() {
  if (!isSupabaseConfigured() || !supabase) {
    // Modo demo: devolver lista con precios demo
    const itemsWithPrices = demoShoppingList.map((item) => {
      const normalizedName = item.product_name.toLowerCase();
      const prices = demoPrices[normalizedName] || [];
      return {
        ...item,
        prices,
      };
    });
    return { data: itemsWithPrices, error: null, isDemo: true };
  }

  // Obtener lista de compras
  const { data: shoppingList, error: listError } = await supabase
    .from("shopping_list")
    .select("*")
    .eq("is_checked", false)
    .order("created_at", { ascending: false });

  if (listError || !shoppingList) {
    return { data: [], error: listError, isDemo: false };
  }

  // Para cada item, obtener precios
  const itemsWithPrices = await Promise.all(
    shoppingList.map(async (item) => {
      const { data: prices } = await getProductPrices(item.product_name);
      return {
        ...item,
        prices: prices || [],
      };
    })
  );

  return { data: itemsWithPrices, error: null, isDemo: false };
}

export async function getAllProducts() {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: [], error: null, isDemo: true };
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching products:", error);
    return { data: [], error, isDemo: false };
  }

  return { data: data || [], error: null, isDemo: false };
}
