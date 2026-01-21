"use server";

import { supabase } from "@/lib/supabase";
import type { ScannedItem } from "@/utils/ai-scanner";
import { revalidatePath } from "next/cache";

export async function saveScannedPrices(
  items: ScannedItem[],
  supermarket: string,
  date: string
) {
  const results = [];

  for (const item of items) {
    // Buscar producto por nombre (case-insensitive)
    const { data: existingProduct } = await supabase
      .from("products")
      .select("id")
      .ilike("name", item.name)
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
          name: item.name,
          category: null,
        })
        .select()
        .single();

      if (productError) {
        console.error("Error creating product:", productError);
        results.push({ success: false, error: productError, item: item.name });
        continue;
      }

      productId = newProduct.id;
    }

    // Guardar precio
    const { data: priceData, error: priceError } = await supabase
      .from("prices")
      .insert({
        product_id: productId,
        supermarket_name: supermarket,
        price: item.price,
        unit_price: item.unit_price || null,
        date_recorded: date,
      })
      .select()
      .single();

    if (priceError) {
      console.error("Error saving price:", priceError);
      results.push({ success: false, error: priceError, item: item.name });
    } else {
      results.push({ success: true, data: priceData, item: item.name });
    }
  }

  revalidatePath("/comparator");
  return { results };
}
