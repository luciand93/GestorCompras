"use server";

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export interface MotherArticle {
    id: string;
    name: string;
    bestPrice?: number;
    bestSupermarket?: string;
    prices: CatalogPrice[];
    aliases: CatalogAlias[];
}

export interface CatalogPrice {
    id: string;
    supermarket_name: string;
    price: number;
    date_recorded: string;
}

export interface CatalogAlias {
    id: string;
    alias_name: string;
    supermarket_name: string;
}

export async function getCatalogData(): Promise<{ success: boolean; data: MotherArticle[]; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
        return { success: false, data: [], error: "Supabase no está configurado" };
    }

    try {
        // 1. Obtener todos los artículos madre
        const { data: products, error: prodErr } = await supabase
            .from("products")
            .select("id, name")
            .order("name");

        if (prodErr) throw prodErr;

        // 2. Obtener todos los precios
        const { data: prices, error: pricesErr } = await supabase
            .from("prices")
            .select("id, product_id, supermarket_name, price, date_recorded")
            .order("date_recorded", { ascending: false });

        if (pricesErr) throw pricesErr;

        // 3. Obtener todos los alias
        const { data: aliases, error: aliasesErr } = await supabase
            .from("product_aliases")
            .select("id, product_id, alias_name, supermarket_name");

        if (aliasesErr) throw aliasesErr;

        const motherArticles: MotherArticle[] = products.map((product) => {
            // Filtrar precios
            const productPricesRaw = prices.filter(p => p.product_id === product.id);

            // Agrupar precios por supermercado quedándonos con el más reciente (ya vienen ordenados)
            const latestPricesMap = new Map<string, CatalogPrice>();
            productPricesRaw.forEach((p) => {
                if (!latestPricesMap.has(p.supermarket_name)) {
                    latestPricesMap.set(p.supermarket_name, {
                        id: p.id,
                        supermarket_name: p.supermarket_name,
                        price: p.price,
                        date_recorded: p.date_recorded
                    });
                }
            });
            const productPrices = Array.from(latestPricesMap.values());

            // Identificar el mejor precio
            let bestPriceVal = undefined;
            let bestSuper = undefined;

            if (productPrices.length > 0) {
                const best = productPrices.reduce((prev, curr) => (curr.price < prev.price ? curr : prev));
                bestPriceVal = best.price;
                bestSuper = best.supermarket_name;
            }

            // Filtrar alias
            const productAliases = aliases
                .filter(a => a.product_id === product.id)
                .map(a => ({
                    id: a.id,
                    alias_name: a.alias_name,
                    supermarket_name: a.supermarket_name
                }));

            return {
                id: product.id,
                name: product.name,
                bestPrice: bestPriceVal,
                bestSupermarket: bestSuper,
                prices: productPrices,
                aliases: productAliases
            };
        });

        return { success: true, data: motherArticles };
    } catch (error: any) {
        console.error("Error obteniendo catálogo:", error);
        return { success: false, data: [], error: error.message };
    }
}

export async function updateMotherArticleName(id: string, newName: string) {
    if (!supabase) return { success: false, error: "No DB" };
    const { error } = await supabase.from("products").update({ name: newName }).eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/comparator");
    return { success: true };
}

export async function deleteMotherArticle(id: string) {
    if (!supabase) return { success: false, error: "No DB" };
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/comparator");
    return { success: true };
}

export async function updateAliasName(id: string, newAlias: string) {
    if (!supabase) return { success: false, error: "No DB" };
    const { error } = await supabase.from("product_aliases").update({ alias_name: newAlias }).eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/comparator");
    return { success: true };
}

export async function deleteAlias(id: string) {
    if (!supabase) return { success: false, error: "No DB" };
    const { error } = await supabase.from("product_aliases").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/comparator");
    return { success: true };
}

export async function updatePrice(id: string, newPrice: number) {
    if (!supabase) return { success: false, error: "No DB" };
    const { error } = await supabase.from("prices").update({ price: newPrice }).eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/comparator");
    return { success: true };
}

export async function deletePrice(id: string) {
    if (!supabase) return { success: false, error: "No DB" };
    const { error } = await supabase.from("prices").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/comparator");
    return { success: true };
}
