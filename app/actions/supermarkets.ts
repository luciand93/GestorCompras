"use server";

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getStores } from "./stores";

export type ProductAtSupermarket = {
  product_id: string;
  product_name: string;
  last_price: number;
  last_date: string;
  count_records: number;
};

// Demo: productos por super para modo sin Supabase
const demoProductsByStore: Record<string, ProductAtSupermarket[]> = {
  Mercadona: [
    { product_id: "p1", product_name: "Aceite de oliva virgen extra", last_price: 5.99, last_date: "2026-01-15", count_records: 1 },
    { product_id: "p2", product_name: "Leche entera", last_price: 0.89, last_date: "2026-01-18", count_records: 1 },
    { product_id: "p3", product_name: "Pan de molde integral", last_price: 1.35, last_date: "2026-01-19", count_records: 1 },
  ],
  Lidl: [
    { product_id: "p1", product_name: "Aceite de oliva virgen extra", last_price: 6.49, last_date: "2026-01-10", count_records: 1 },
  ],
  Carrefour: [
    { product_id: "p1", product_name: "Aceite de oliva virgen extra", last_price: 6.25, last_date: "2026-01-12", count_records: 1 },
  ],
  Dia: [
    { product_id: "p2", product_name: "Leche entera", last_price: 0.79, last_date: "2026-01-17", count_records: 1 },
  ],
  Aldi: [],
};

/**
 * Devuelve todos los supermercados que existen en la base de datos (prices).
 */
export async function getSupermarkets(): Promise<{ data: string[]; error: Error | null; isDemo: boolean }> {
  const stores = await getStores();
  return { data: stores, error: null, isDemo: !isSupabaseConfigured() };
}

/**
 * Devuelve los artículos (productos) que se han comprado/registrado en un supermercado,
 * con el último precio y fecha.
 */
export async function getProductsBySupermarket(
  supermarketName: string
): Promise<{ data: ProductAtSupermarket[]; error: Error | null; isDemo: boolean }> {
  if (!isSupabaseConfigured() || !supabase) {
    const demo = demoProductsByStore[supermarketName] ?? [];
    return { data: demo, error: null, isDemo: true };
  }

  const { data: rows, error } = await supabase
    .from("prices")
    .select(`
      product_id,
      price,
      date_recorded,
      products ( name )
    `)
    .eq("supermarket_name", supermarketName)
    .order("date_recorded", { ascending: false });

  if (error) {
    console.error("Error getProductsBySupermarket:", error);
    return { data: [], error: error as unknown as Error, isDemo: false };
  }

  // Por cada product_id quedarnos solo el registro más reciente
  const byProduct = new Map<string, ProductAtSupermarket>();
  for (const r of rows || []) {
    const pid = (r as { product_id: string }).product_id;
    if (byProduct.has(pid)) continue;
    const products = (r as { products: { name: string } | null }).products;
    const name = products?.name ?? "Producto";
    byProduct.set(pid, {
      product_id: pid,
      product_name: name,
      last_price: Number((r as { price: number }).price),
      last_date: (r as { date_recorded: string }).date_recorded,
      count_records: 1,
    });
  }

  const list = Array.from(byProduct.values()).sort((a, b) =>
    a.product_name.localeCompare(b.product_name)
  );

  return { data: list, error: null, isDemo: false };
}
