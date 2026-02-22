"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { AlertCircle } from "lucide-react";

type DbStatus = "checking" | "ok" | "error";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [dbStatus, setDbStatus] = useState<DbStatus>("checking");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function checkDb() {
      try {
        const res = await fetch("/api/db-health", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data.ok) {
          setDbStatus("ok");
          return;
        }
        setDbStatus("error");
        setErrorMessage(
          data?.message || "No se pudo verificar el acceso a la base de datos."
        );
      } catch {
        if (cancelled) return;
        setDbStatus("error");
        setErrorMessage(
          "No hay conexión. Comprueba tu red e intenta de nuevo."
        );
      }
    }
    checkDb();
    return () => {
      cancelled = true;
    };
  }, []);

  const retry = () => {
    setDbStatus("checking");
    setErrorMessage("");
    fetch("/api/db-health", { cache: "no-store" })
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (data?.ok) setDbStatus("ok");
        else {
          setDbStatus("error");
          setErrorMessage(
            data?.message || "No se pudo verificar el acceso a la base de datos."
          );
        }
      })
      .catch(() => {
        setDbStatus("error");
        setErrorMessage(
          "No hay conexión. Comprueba tu red e intenta de nuevo."
        );
      });
  };

  if (dbStatus === "checking") {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <p className="text-[#10b981]/80 text-sm">Comprobando conexión...</p>
      </div>
    );
  }

  if (dbStatus === "error") {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6 safe-area-inset">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-red-500/20 p-4">
              <AlertCircle className="h-10 w-10 text-red-400" />
            </div>
          </div>
          <h1 className="text-lg font-semibold text-white">
            Error de conexión a la base de datos
          </h1>
          <p className="text-sm text-white/80">{errorMessage}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 px-6 py-3 rounded-lg bg-[#10b981] text-[#09090b] font-medium text-sm hover:bg-[#10b981]/90 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background pb-20 safe-area-bottom">
        {children}
      </div>
      <BottomNav />
    </>
  );
}
