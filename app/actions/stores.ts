"use server";

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * Obtiene la lista de tiendas únicas de la base de datos
 */
export async function getStores(): Promise<string[]> {
  if (!isSupabaseConfigured() || !supabase) {
    // Demo stores
    return ["Mercadona", "Lidl", "Carrefour", "Dia", "Aldi"];
  }

  const { data, error } = await supabase
    .from("prices")
    .select("supermarket_name")
    .order("supermarket_name");

  if (error || !data) {
    return [];
  }

  // Obtener nombres únicos
  const uniqueStores = [...new Set(data.map(d => d.supermarket_name).filter(Boolean))];
  return uniqueStores;
}
