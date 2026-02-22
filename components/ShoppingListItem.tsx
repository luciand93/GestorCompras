import { useState } from "react";
import { useSwipeable } from "react-swipeable";
import { motion, AnimatePresence } from "framer-motion";
import type { ShoppingListItem as IShoppingListItem } from "@/lib/supabase";
import { hapticFeedback } from "@/utils/haptics";

interface Props {
    item: IShoppingListItem;
    onToggle: (id: string, currentChecked: boolean) => void;
    onDelete: (id: string) => void;
    onAddQuantity?: (id: string) => void;
}

export function ShoppingListItem({ item, onToggle, onDelete, onAddQuantity }: Props) {
    const [swipedDelete, setSwipedDelete] = useState(false);

    const handlers = useSwipeable({
        onSwipedLeft: () => {
            hapticFeedback.medium();
            setSwipedDelete(true);
            setTimeout(() => onDelete(item.id), 300);
        },
        onSwipedRight: () => {
            if (onAddQuantity) {
                hapticFeedback.light();
                onAddQuantity(item.id);
            }
        },
        trackMouse: true,
        preventScrollOnSwipe: true,
    });

    return (
        <motion.div
            {...handlers}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: swipedDelete ? 0 : item.is_checked ? 0.5 : 1, x: swipedDelete ? -100 : 0, scale: swipedDelete ? 0.9 : 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="relative flex items-center gap-4 p-4 active:bg-[#10b981]/5 transition-colors overflow-hidden border-b border-[#10b981]/10 last:border-0 bg-[#18181b]"
        >
            <input
                type="checkbox"
                checked={item.is_checked}
                onChange={() => {
                    hapticFeedback.light();
                    onToggle(item.id, item.is_checked);
                }}
                className="ios-checkbox z-10"
            />
            <div className="flex-1 min-w-0 z-10 pointer-events-none">
                <p className={`text-[17px] font-medium leading-snug truncate ${item.is_checked ? 'line-through text-[#a1a1aa]/60' : 'text-white'}`}>
                    {item.product_name}
                </p>
                {item.quantity > 1 && (
                    <p className="text-sm text-[#a1a1aa]/60">{item.quantity} unidades</p>
                )}
            </div>

            {/* Fondo rojo al deslizar izquierda */}
            <div className="absolute inset-y-0 right-0 w-1/2 bg-red-500/20 flex items-center justify-end px-4 opacity-0 transition-opacity" style={{ opacity: swipedDelete ? 1 : 0 }}>
                <span className="material-symbols-outlined text-red-500">delete</span>
            </div>

        </motion.div>
    );
}
