"use server";

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { ScannedPrice } from "@/app/actions/scan-image";
import { revalidatePath } from "next/cache";

interface ScannedItemToSave {
  productName: string;
  price: number;
  store: string;
  matchedProductId?: string;
  isNewProduct?: boolean;
  ticketName?: string;
}

export async function saveScannedPrices(items: ScannedPrice[]) {
  // Convertir al nuevo formato
  const itemsToSave: ScannedItemToSave[] = items.map(item => ({
    productName: item.canonicalName || item.productName,
    price: item.price,
    store: item.store || 'Tienda',
    isNewProduct: true,
    ticketName: item.productName
  }));

  return saveScannedPricesWithMatching(itemsToSave);
}

export async function saveScannedPricesWithMatching(items: ScannedItemToSave[]) {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: true,
      results: items.map(item => ({
        success: true,
        item: item.productName,
        isDemo: true
      })),
      isDemo: true,
      error: undefined
    };
  }

  const results = [];
  const today = new Date().toISOString().split('T')[0];

  for (const item of items) {
    try {
      let productId: string;

      if (item.matchedProductId) {
        // Usar producto existente vinculado
        productId = item.matchedProductId;

        // Guardar el nombre original del ticket como alias si está disponible
        const aliasToSave = item.ticketName || item.productName;
        const { data: existingAlias } = await supabase
          .from("product_aliases")
          .select("id")
          .eq("product_id", productId)
          .eq("alias_name", aliasToSave)
          .eq("supermarket_name", item.store)
          .limit(1)
          .single();

        if (!existingAlias && aliasToSave !== item.productName) {
          await supabase.from("product_aliases").insert({
            product_id: productId,
            alias_name: aliasToSave,
            supermarket_name: item.store
          });
        }
      } else {
        // Buscar producto existente por nombre
        const { data: existingProduct } = await supabase
          .from("products")
          .select("id")
          .ilike("name", item.productName)
          .limit(1)
          .single();

        if (existingProduct) {
          productId = existingProduct.id;
        } else {
          // Buscar por alias
          const { data: existingAlias } = await supabase
            .from("product_aliases")
            .select("product_id")
            .ilike("alias_name", item.ticketName || item.productName)
            .limit(1)
            .single();

          if (existingAlias) {
            productId = existingAlias.product_id;
          } else {
            // Crear nuevo producto
            const { data: newProduct, error: productError } = await supabase
              .from("products")
              .insert({ name: item.productName })
              .select()
              .single();

            if (productError) {
              results.push({ success: false, error: productError.message, item: item.productName });
              continue;
            }

            productId = newProduct.id;

            // Guardar el alias inicial
            if (item.ticketName && item.ticketName !== item.productName) {
              await supabase.from("product_aliases").insert({
                product_id: productId,
                alias_name: item.ticketName,
                supermarket_name: item.store
              });
            }
          }
        }
      }

      // Guardar precio
      const { data: priceData, error: priceError } = await supabase
        .from("prices")
        .insert({
          product_id: productId,
          supermarket_name: item.store,
          price: item.price,
          unit_price: null,
          date_recorded: today,
        })
        .select()
        .single();

      if (priceError) {
        results.push({ success: false, error: priceError.message, item: item.productName });
      } else {
        results.push({ success: true, data: priceData, item: item.productName });
      }
    } catch (err: any) {
      results.push({ success: false, error: err.message, item: item.productName });
    }
  }

  revalidatePath("/comparator");
  revalidatePath("/");

  const hasErrors = results.some(r => !r.success);
  return {
    success: !hasErrors,
    results,
    isDemo: false,
    error: hasErrors ? "Algunos productos no se guardaron correctamente" : undefined
  };
}
