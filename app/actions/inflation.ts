"use server";

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export async function checkInflationAlerts(productIds: string[]) {
    if (!isSupabaseConfigured() || !supabase) return {};

    const validIds = productIds.filter(Boolean);
    if (validIds.length === 0) return {};

    try {
        const { data: prices } = await supabase
            .from('prices')
            .select('product_id, unit_price, price')
            .in('product_id', validIds);

        if (!prices || prices.length === 0) return {};

        const alerts: Record<string, { minPrice: number }> = {};

        validIds.forEach(id => {
            const pPrices = prices.filter(p => p.product_id === id);
            if (pPrices.length > 0) {
                // Encontrar el precio histórico más bajo registrado para este artículo
                const validValues = pPrices.map(p => p.unit_price || p.price).filter(p => p > 0);
                if (validValues.length > 0) {
                    const minPrice = Math.min(...validValues);
                    if (minPrice > 0 && minPrice < Infinity) {
                        alerts[id] = { minPrice };
                    }
                }
            }
        });

        return alerts;
    } catch (err) {
        console.error("Error checkInflationAlerts:", err);
        return {};
    }
}
