"use server";

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export interface DashboardData {
    currentMonthTotal: number;
    lastMonthTotal: number;
    categorySpend: { category: string; amount: number }[];
}

export async function getDashboardData(): Promise<DashboardData> {
    const fallback: DashboardData = {
        currentMonthTotal: 0,
        lastMonthTotal: 0,
        categorySpend: [],
    };

    if (!isSupabaseConfigured() || !supabase) {
        return fallback;
    }

    try {
        const now = new Date();
        // Obtener inicio de mes actual
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        // Obtener inicio de hace 1 mes
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

        const { data: prices } = await supabase
            .from("prices")
            .select(`
        price, 
        created_at, 
        products(name, category)
      `);

        if (!prices || prices.length === 0) return fallback;

        let current = 0;
        let last = 0;
        const catMap: Record<string, number> = {};

        prices.forEach((p: any) => {
            // Ignorar si no tiene array elements de created_at, o está malformado
            if (!p.created_at) return;

            const isCurrentMonth = p.created_at >= currentMonthStart;
            const isLastMonth = p.created_at >= lastMonthStart && p.created_at < currentMonthStart;

            if (isCurrentMonth) {
                current += p.price || 0;

                let rawCat = p.products?.category || null;
                let pName = (p.products?.name || "").toLowerCase();

                let cat = "Otros";
                if (rawCat) cat = rawCat;
                else if (pName.includes("llet") || pName.includes("leche") || pName.includes("yogur") || pName.includes("queso") || pName.includes("manteca")) cat = "Lácteos";
                else if (pName.includes("ternera") || pName.includes("pollo") || pName.includes("cerdo") || pName.includes("carne") || pName.includes("jamón")) cat = "Carne";
                else if (pName.includes("papel") || pName.includes("detergente") || pName.includes("lejía") || pName.includes("fregasuelos")) cat = "Limpieza";
                else if (pName.includes("pescado") || pName.includes("atún") || pName.includes("merluza") || pName.includes("salmón")) cat = "Pescado";
                else if (pName.includes("pan") || pName.includes("arroz") || pName.includes("pasta") || pName.includes("tomate frito")) cat = "Despensa";
                else if (pName.includes("manzana") || pName.includes("plátano") || pName.includes("patata") || pName.includes("cebolla") || pName.includes("tomate")) cat = "Fruta y Verdura";

                catMap[cat] = (catMap[cat] || 0) + (p.price || 0);
            } else if (isLastMonth) {
                last += p.price || 0;
            }
        });

        const categories = Object.keys(catMap).map(k => ({ category: k, amount: catMap[k] })).sort((a, b) => b.amount - a.amount);

        return {
            currentMonthTotal: current,
            lastMonthTotal: last,
            categorySpend: categories
        };

    } catch (err) {
        console.error("Dashboard error:", err);
        return fallback;
    }
}
