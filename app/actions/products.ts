"use server";

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// Productos de demostración
const demoProducts = [
  "Aceite de oliva virgen extra",
  "Leche entera",
  "Pan de molde integral",
  "Huevos",
  "Arroz",
  "Pasta",
  "Tomate frito",
  "Atún en lata",
  "Yogur natural",
  "Queso fresco",
  "Jamón serrano",
  "Pollo",
  "Ternera",
  "Patatas",
  "Cebolla",
  "Zanahoria",
  "Lechuga",
  "Tomate",
  "Plátanos",
  "Manzanas",
  "Naranjas",
  "Café",
  "Azúcar",
  "Sal",
  "Detergente",
  "Papel higiénico",
];

export async function searchProducts(query: string): Promise<string[]> {
  if (!query || query.length < 2) {
    return [];
  }

  if (!isSupabaseConfigured() || !supabase) {
    // Modo demo: filtrar productos de demostración
    const filtered = demoProducts.filter((p) =>
      p.toLowerCase().includes(query.toLowerCase())
    );
    return filtered.slice(0, 8);
  }

  try {
    // Buscar en productos existentes
    const { data: products } = await supabase
      .from("products")
      .select("name")
      .ilike("name", `%${query}%`)
      .limit(5);

    // Buscar también en la lista de compras (nombres únicos)
    const { data: shoppingItems } = await supabase
      .from("shopping_list")
      .select("product_name")
      .ilike("product_name", `%${query}%`)
      .limit(5);

    // Combinar y eliminar duplicados
    const allNames = new Set<string>();
    
    products?.forEach((p) => allNames.add(p.name));
    shoppingItems?.forEach((s) => allNames.add(s.product_name));

    return Array.from(allNames).slice(0, 8);
  } catch (error) {
    console.error("Error searching products:", error);
    return [];
  }
}

export async function getRecentProducts(): Promise<string[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return demoProducts.slice(0, 10);
  }

  try {
    // Obtener productos recientes de la lista de compras
    const { data } = await supabase
      .from("shopping_list")
      .select("product_name")
      .order("created_at", { ascending: false })
      .limit(20);

    // Eliminar duplicados manteniendo el orden
    const uniqueNames: string[] = [];
    const seen = new Set<string>();
    
    data?.forEach((item) => {
      const name = item.product_name.toLowerCase();
      if (!seen.has(name)) {
        seen.add(name);
        uniqueNames.push(item.product_name);
      }
    });

    return uniqueNames.slice(0, 10);
  } catch (error) {
    console.error("Error getting recent products:", error);
    return [];
  }
}
