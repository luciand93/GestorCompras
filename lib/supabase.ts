import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Crear cliente solo si las variables de entorno están disponibles
let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };

// Función para verificar si Supabase está configurado
export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

// Tipos para TypeScript
export type Product = {
  id: string;
  name: string;
  category: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Price = {
  id: string;
  product_id: string;
  supermarket_name: string;
  price: number;
  unit_price: number | null;
  date_recorded: string;
  created_at: string;
};

export type ShoppingListItem = {
  id: string;
  product_name: string;
  is_checked: boolean;
  quantity: number;
  created_at: string;
  updated_at: string;
};
