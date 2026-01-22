"use server";

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { ScannedPrice } from "@/utils/ai-scanner";
import { revalidatePath } from "next/cache";

export async function saveScannedPrices(items: ScannedPrice[]) {
  // Verificar si Supabase está configurado
  if (!isSupabaseConfigured() || !supabase) {
    return { 
      success: true,
      results: items.map(item => ({ 
        success: true, 
        item: item.productName,
        isDemo: true 
      })),
      isDemo: true 
    };
  }

  const results = [];
  const today = new Date().toISOString().split('T')[0];

  for (const item of items) {
    // Buscar producto por nombre (case-insensitive)
    const { data: existingProduct } = await supabase
      .from("products")
      .select("id")
      .ilike("name", item.productName)
      .limit(1)
      .single();

    let productId: string;

    if (existingProduct) {
      productId = existingProduct.id;
    } else {
      // Crear nuevo producto
      const { data: newProduct, error: productError } = await supabase
        .from("products")
        .insert({
          name: item.productName,
          category: null,
        })
        .select()
        .single();

      if (productError) {
        console.error("Error creating product:", productError);
        results.push({ success: false, error: productError.message, item: item.productName });
        continue;
      }

      productId = newProduct.id;
    }

    // Guardar precio
    const { data: priceData, error: priceError } = await supabase
      .from("prices")
      .insert({
        product_id: productId,
        supermarket_name: item.store || 'Tienda',
        price: item.price,
        unit_price: null,
        date_recorded: today,
      })
      .select()
      .single();

    if (priceError) {
      console.error("Error saving price:", priceError);
      results.push({ success: false, error: priceError.message, item: item.productName });
    } else {
      results.push({ success: true, data: priceData, item: item.productName });
    }
  }

  revalidatePath("/comparator");
  return { success: true, results, isDemo: false };
}
