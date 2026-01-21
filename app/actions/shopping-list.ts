"use server";

import { supabase, isSupabaseConfigured, ShoppingListItem } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

// Datos de demostración cuando Supabase no está configurado
const demoItems: ShoppingListItem[] = [
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
  {
    id: "demo-3",
    product_name: "Pan de molde integral",
    is_checked: true,
    quantity: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export async function getShoppingList() {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: demoItems, error: null, isDemo: true };
  }

  const { data, error } = await supabase
    .from("shopping_list")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching shopping list:", error);
    return { data: [], error, isDemo: false };
  }

  return { data: data || [], error: null, isDemo: false };
}

export async function addToShoppingList(productName: string, quantity: number = 1) {
  if (!isSupabaseConfigured() || !supabase) {
    // En modo demo, simular éxito
    return { 
      data: { 
        id: `demo-${Date.now()}`, 
        product_name: productName, 
        quantity, 
        is_checked: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, 
      error: null,
      isDemo: true 
    };
  }

  const { data, error } = await supabase
    .from("shopping_list")
    .insert({
      product_name: productName,
      quantity,
      is_checked: false,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding to shopping list:", error);
    return { data: null, error, isDemo: false };
  }

  revalidatePath("/");
  return { data, error: null, isDemo: false };
}

export async function toggleItemChecked(id: string, isChecked: boolean) {
  if (!isSupabaseConfigured() || !supabase) {
    return { data: null, error: null, isDemo: true };
  }

  const { data, error } = await supabase
    .from("shopping_list")
    .update({ is_checked: isChecked })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating item:", error);
    return { data: null, error, isDemo: false };
  }

  revalidatePath("/");
  return { data, error: null, isDemo: false };
}

export async function deleteItem(id: string) {
  if (!isSupabaseConfigured() || !supabase) {
    return { error: null, isDemo: true };
  }

  const { error } = await supabase
    .from("shopping_list")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting item:", error);
    return { error, isDemo: false };
  }

  revalidatePath("/");
  return { error: null, isDemo: false };
}

export async function clearCheckedItems() {
  if (!isSupabaseConfigured() || !supabase) {
    return { error: null, isDemo: true };
  }

  const { error } = await supabase
    .from("shopping_list")
    .delete()
    .eq("is_checked", true);

  if (error) {
    console.error("Error clearing checked items:", error);
    return { error, isDemo: false };
  }

  revalidatePath("/");
  return { error: null, isDemo: false };
}
