"use client";

import { useEffect, useState } from "react";
import { getDashboardData, type DashboardData } from "@/app/actions/dashboard";

export function DashboardView() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetch() {
            const dbData = await getDashboardData();
            setData(dbData);
            setLoading(false);
        }
        fetch();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col gap-6 px-4 animate-in fade-in py-6">
                <div className="bg-[#18181b] rounded-3xl h-40 w-full animate-pulse border border-[#10b981]/5"></div>
                <div className="h-4 w-32 bg-[#18181b] rounded animate-pulse"></div>
                <div className="bg-[#09090b] border border-[#10b981]/10 rounded-2xl p-4 gap-4 flex flex-col shadow-inner">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex flex-col gap-2">
                            <div className="flex justify-between">
                                <div className="h-3 w-20 bg-[#18181b] rounded animate-pulse"></div>
                                <div className="h-3 w-10 bg-[#18181b] rounded animate-pulse"></div>
                            </div>
                            <div className="h-4 w-full bg-[#18181b] rounded-full"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!data) return null;

    const saving = data.lastMonthTotal - data.currentMonthTotal;
    const isSaving = saving >= 0;

    // Maximo valor para usar como 100% de la barra
    const maxSpend = Math.max(...data.categorySpend.map(c => c.amount), 1);

    return (
        <div className="flex flex-col gap-6 px-4 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Resumen de Meses */}
            <div className="bg-[#18181b] rounded-3xl p-6 border border-[#10b981]/20 shadow-lg relative overflow-hidden">
                {/* Glow destello */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#10b981]/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                <p className="text-sm font-semibold text-[#a1a1aa] mb-1 uppercase tracking-widest">Este mes</p>
                <div className="flex items-end gap-2 mb-4">
                    <h2 className="text-5xl font-black text-white">{data.currentMonthTotal.toFixed(2)}</h2>
                    <span className="text-2xl text-[#10b981] font-bold mb-1">€</span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex-1 bg-black/30 rounded-full h-8 overflow-hidden relative border border-[#a1a1aa]/20">
                        <div
                            className="h-full bg-gradient-to-r from-white/20 to-white/40"
                            style={{ width: `${Math.min((data.currentMonthTotal / (data.lastMonthTotal || 1)) * 100, 100)}%` }}
                        />
                    </div>
                    <p className="text-xs text-[#a1a1aa]/80 whitespace-nowrap text-right">
                        Mes P. <br /><strong className="text-white">{data.lastMonthTotal.toFixed(2)}€</strong>
                    </p>
                </div>

                <div className={`mt-4 pt-4 border-t border-[#10b981]/10 flex items-center justify-between ${isSaving ? 'text-[#10b981]' : 'text-amber-500'}`}>
                    <div className="flex items-center gap-1.5 font-bold">
                        <span className="material-symbols-outlined text-lg">{isSaving ? 'trending_down' : 'trending_up'}</span>
                        <span>{isSaving ? 'Ahorras' : 'Gastas'}</span>
                    </div>
                    <span className="font-black">
                        {Math.abs(saving).toFixed(2)}€
                    </span>
                </div>
            </div>

            {/* Breakdown Categorias */}
            <div>
                <h3 className="text-sm font-bold text-[#a1a1aa] uppercase tracking-wider mb-4 px-2">¿Dónde va tu dinero?</h3>

                {data.categorySpend.length === 0 ? (
                    <div className="text-center py-8 bg-[#18181b]/50 border border-[#10b981]/10 rounded-2xl">
                        <p className="text-[#a1a1aa]/60 text-sm">Escanea facturas para desglosar tus gastos automáticamente.</p>
                    </div>
                ) : (
                    <div className="bg-[#09090b] border border-[#10b981]/20 rounded-2xl p-4 gap-4 flex flex-col shadow-inner">
                        {data.categorySpend.map((cat, i) => {
                            const percentage = (cat.amount / maxSpend) * 100;
                            // Colors based on loop
                            const colors = ['bg-[#3b82f6]', 'bg-[#10b981]', 'bg-amber-400', 'bg-purple-500', 'bg-rose-500', 'bg-[#a1a1aa]'];
                            const bgColor = colors[i % colors.length];

                            return (
                                <div key={i} className="flex flex-col gap-1">
                                    <div className="flex justify-between items-end text-sm">
                                        <span className="font-bold text-white/90">{cat.category}</span>
                                        <span className="font-black text-white/80">{cat.amount.toFixed(2)}€</span>
                                    </div>
                                    <div className="h-4 w-full bg-[#18181b] rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 origin-left ${bgColor}`}
                                            style={{ width: `${percentage}%`, transform: 'scaleX(1)' }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

        </div >
    );
}
