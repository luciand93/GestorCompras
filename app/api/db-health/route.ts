import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * Comprueba que la aplicación tiene acceso a la base de datos (Supabase).
 * Se usa al abrir la app para avisar al usuario si no hay conexión.
 */
export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json(
      {
        ok: false,
        message: "La base de datos no está configurada. Comprueba las variables de entorno (NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY).",
      },
      { status: 503 }
    );
  }

  try {
    const { error } = await supabase
      .from("shopping_list")
      .select("id")
      .limit(1);

    if (error) {
      console.error("DB health check error:", error);
      return NextResponse.json(
        {
          ok: false,
          message: "No se puede conectar a la base de datos.",
          detail: error.message,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("DB health check exception:", err);
    return NextResponse.json(
      {
        ok: false,
        message: "Error al verificar la base de datos.",
        detail: message,
      },
      { status: 503 }
    );
  }
}
