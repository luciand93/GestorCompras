"use server";

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export interface ProductSuggestion {
  id: string;
  name: string;
  similarity: number;
  aliases?: string[];
}

/**
 * Busca productos similares a un nombre dado
 */
export async function findSimilarProducts(searchName: string): Promise<ProductSuggestion[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  const normalizedSearch = normalizeProductName(searchName);
  const searchWords = normalizedSearch.split(' ').filter(w => w.length > 2);

  try {
    // Buscar en productos
    const { data: products } = await supabase
      .from("products")
      .select("id, name")
      .limit(50);

    // Buscar en aliases
    const { data: aliases } = await supabase
      .from("product_aliases")
      .select("product_id, alias_name")
      .limit(100);

    const suggestions: ProductSuggestion[] = [];
    const seen = new Set<string>();

    // Calcular similitud con productos
    products?.forEach(p => {
      const similarity = calculateSimilarity(normalizedSearch, normalizeProductName(p.name), searchWords);
      if (similarity > 0.3 && !seen.has(p.id)) {
        seen.add(p.id);
        suggestions.push({
          id: p.id,
          name: p.name,
          similarity
        });
      }
    });

    // Calcular similitud con aliases
    aliases?.forEach(a => {
      if (seen.has(a.product_id)) return;
      
      const similarity = calculateSimilarity(normalizedSearch, normalizeProductName(a.alias_name), searchWords);
      if (similarity > 0.3) {
        // Buscar el nombre del producto maestro
        const product = products?.find(p => p.id === a.product_id);
        if (product) {
          seen.add(a.product_id);
          suggestions.push({
            id: a.product_id,
            name: product.name,
            similarity,
            aliases: [a.alias_name]
          });
        }
      }
    });

    // Ordenar por similitud
    suggestions.sort((a, b) => b.similarity - a.similarity);
    
    return suggestions.slice(0, 5);

  } catch (error) {
    console.error("Error finding similar products:", error);
    return [];
  }
}

/**
 * Vincula un nombre/alias a un producto existente
 */
export async function linkProductAlias(
  productId: string, 
  aliasName: string, 
  supermarket?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: true }; // Demo mode
  }

  try {
    const { error } = await supabase
      .from("product_aliases")
      .insert({
        product_id: productId,
        alias_name: aliasName,
        supermarket_name: supermarket || null
      });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error("Error linking alias:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Crea un nuevo producto maestro con un alias
 */
export async function createProductWithAlias(
  masterName: string,
  aliasName?: string,
  supermarket?: string
): Promise<{ success: boolean; productId?: string; error?: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    return { success: true, productId: 'demo-id' };
  }

  try {
    // Crear producto maestro
    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({ name: masterName })
      .select()
      .single();

    if (productError) throw productError;

    // Si hay alias diferente, crearlo
    if (aliasName && aliasName !== masterName) {
      await supabase
        .from("product_aliases")
        .insert({
          product_id: product.id,
          alias_name: aliasName,
          supermarket_name: supermarket || null
        });
    }

    return { success: true, productId: product.id };
  } catch (error: any) {
    console.error("Error creating product:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene las sugerencias de productos para vincular al escanear
 */
export async function getSuggestionsForScannedProduct(
  scannedName: string,
  supermarket: string
): Promise<{
  exactMatch?: { id: string; name: string };
  suggestions: ProductSuggestion[];
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return { suggestions: [] };
  }

  const normalized = normalizeProductName(scannedName);

  try {
    // Buscar coincidencia exacta por alias
    const { data: exactAlias } = await supabase
      .from("product_aliases")
      .select("product_id, products(id, name)")
      .eq("alias_name", scannedName)
      .eq("supermarket_name", supermarket)
      .limit(1)
      .single();

    if (exactAlias?.products) {
      return {
        exactMatch: {
          id: (exactAlias.products as any).id,
          name: (exactAlias.products as any).name
        },
        suggestions: []
      };
    }

    // Buscar coincidencia exacta por nombre de producto
    const { data: exactProduct } = await supabase
      .from("products")
      .select("id, name")
      .ilike("name", normalized)
      .limit(1)
      .single();

    if (exactProduct) {
      return {
        exactMatch: exactProduct,
        suggestions: []
      };
    }

    // Buscar sugerencias similares
    const suggestions = await findSimilarProducts(scannedName);
    
    return { suggestions };

  } catch (error) {
    const suggestions = await findSimilarProducts(scannedName);
    return { suggestions };
  }
}

// === Utilidades ===

function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
    .replace(/[^a-z0-9\s]/g, " ")    // Solo letras, números y espacios
    .replace(/\s+/g, " ")            // Espacios múltiples a uno
    .trim();
}

function calculateSimilarity(search: string, target: string, searchWords: string[]): number {
  // Coincidencia exacta
  if (search === target) return 1;
  
  // Uno contiene al otro
  if (target.includes(search) || search.includes(target)) return 0.8;
  
  // Contar palabras que coinciden
  const targetWords = target.split(' ');
  let matchingWords = 0;
  
  searchWords.forEach(sw => {
    if (targetWords.some(tw => tw.includes(sw) || sw.includes(tw))) {
      matchingWords++;
    }
  });
  
  if (searchWords.length === 0) return 0;
  
  return matchingWords / Math.max(searchWords.length, targetWords.length);
}
