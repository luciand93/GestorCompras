"use client";

import { useState, useRef, useEffect } from "react";
import { scanImageOnServer, type ScannedPrice } from "@/app/actions/scan-image";
import { saveScannedPricesWithMatching } from "@/app/actions/scanner";
import { getStores } from "@/app/actions/stores";
import { findSimilarProducts, type ProductSuggestion } from "@/app/actions/product-matching";
import imageProcessor from "@/utils/image-processor";

interface ScannedItemWithMatch extends ScannedPrice {
  matchedProductId?: string;
  matchedProductName?: string;
  suggestions?: ProductSuggestion[];
  isNewProduct?: boolean;
  customName?: string;
}

export function ScannerView() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [scannedItems, setScannedItems] = useState<ScannedItemWithMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Para selector de tienda
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [newStoreName, setNewStoreName] = useState("");
  const [availableStores, setAvailableStores] = useState<string[]>([]);

  // Para vinculación de productos
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [showProductMatcher, setShowProductMatcher] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    const stores = await getStores();
    setAvailableStores(stores);
  };

  const startCamera = async () => {
    setError(null);
    cameraInputRef.current?.click();
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Permitir múltiples archivos
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      const reader = new FileReader();
      const readPromise = new Promise<void>((resolve) => {
        reader.onload = (event) => {
          const imageData = event.target?.result as string;
          setCapturedImages(prev => [...prev, imageData]);
          resolve();
        };
      });
      reader.readAsDataURL(file);
      await readPromise;
    }
    e.target.value = '';
  };

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      setCapturedImages(prev => [...prev, imageData]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const processImages = async () => {
    if (capturedImages.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setSavedSuccess(false);
    setShowResults(false);

    try {
      const optimizedImages = await Promise.all(
        capturedImages.map(img =>
          imageProcessor.processImage(img, {
            maxWidth: 512,
            maxHeight: 640,
            quality: 0.4,
            grayscale: true,
            contrast: 1.5,
            invert: false
          })
        )
      );

      const result = await scanImageOnServer(optimizedImages);

      if (result.error) {
        setError(result.error);
        setScannedItems([]);
      } else if (result.prices && result.prices.length > 0) {
        // Buscar coincidencias para cada producto
        const itemsWithMatches: ScannedItemWithMatch[] = await Promise.all(
          result.prices.map(async (item) => {
            const suggestions = await findSimilarProducts(item.canonicalName || item.productName);
            return {
              ...item,
              suggestions,
              isNewProduct: suggestions.length === 0,
              matchedProductId: suggestions.length > 0 ? suggestions[0].id : undefined,
              matchedProductName: suggestions.length > 0 ? suggestions[0].name : undefined
            };
          })
        );

        setScannedItems(itemsWithMatches);
        setShowResults(true);

        const stores = await getStores();
        const detectedStore = (result.prices[0]?.store || "").trim();
        const isValidStore =
          detectedStore &&
          detectedStore !== "Tienda" &&
          !detectedStore.toLowerCase().includes("desconocid");

        setAvailableStores(
          isValidStore && !stores.includes(detectedStore)
            ? [detectedStore, ...stores]
            : stores
        );

        if (isValidStore) {
          setSelectedStore(detectedStore);
          setShowStoreSelector(false);
        } else {
          setSelectedStore("");
          setShowStoreSelector(true); // Obligatorio: abrir selector
        }
      } else {
        setError("No se detectaron productos. Intenta con mejor iluminación.");
      }
    } catch (err: any) {
      setError(err.message || "Error desconocido");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectStore = (store: string) => {
    setSelectedStore(store);
    setScannedItems(items => items.map(item => ({ ...item, store })));
    setShowStoreSelector(false);
    setNewStoreName("");
  };

  const handleCreateStore = () => {
    if (newStoreName.trim()) {
      handleSelectStore(newStoreName.trim());
      setAvailableStores(prev => [...prev, newStoreName.trim()]);
    }
  };

  const handleMatchProduct = (index: number, suggestion: ProductSuggestion) => {
    setScannedItems(items => items.map((item, i) =>
      i === index
        ? { ...item, matchedProductId: suggestion.id, matchedProductName: suggestion.name, isNewProduct: false }
        : item
    ));
    setShowProductMatcher(false);
    setEditingItemIndex(null);
  };

  const handleSetAsNewProduct = (index: number, customName?: string) => {
    setScannedItems(items => items.map((item, i) =>
      i === index
        ? { ...item, matchedProductId: undefined, matchedProductName: undefined, isNewProduct: true, customName }
        : item
    ));
    setShowProductMatcher(false);
    setEditingItemIndex(null);
  };

  const handleSaveToDatabase = async () => {
    if (scannedItems.length === 0) return;

    if (!selectedStore) {
      setShowStoreSelector(true);
      return;
    }

    setIsSaving(true);
    const itemsToSave = scannedItems.map(item => ({
      productName: item.customName || item.matchedProductName || item.canonicalName || item.productName,
      price: item.price,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      store: selectedStore,
      matchedProductId: item.matchedProductId,
      isNewProduct: item.isNewProduct,
      ticketName: item.productName
    }));

    const result = await saveScannedPricesWithMatching(itemsToSave);

    if (result.success) {
      setSavedSuccess(true);
      setTimeout(() => {
        setScannedItems([]);
        setShowResults(false);
        setSavedSuccess(false);
        setSelectedStore("");
      }, 2000);
    } else {
      setError(result.error || "Error al guardar");
    }
    setIsSaving(false);
  };

  const clearResults = () => {
    setScannedItems([]);
    setCapturedImages([]);
    setShowResults(false);
    setSavedSuccess(false);
    setSelectedStore("");
    setError(null);
  };

  const total = scannedItems.reduce((sum, item) => sum + item.price, 0);
  const currentEditingItem = editingItemIndex !== null ? scannedItems[editingItemIndex] : null;

  return (
    <div className="flex flex-col min-h-screen bg-[#102213] text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#102213]/80 ios-blur p-4 pb-2">
        <h1 className="text-lg font-bold text-center">Escáner de Precios</h1>
      </header>

      {/* Action buttons */}
      <div className="flex gap-3 px-4 py-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 h-12 px-5 bg-[#13ec37]/20 text-[#13ec37] border border-[#13ec37]/30 rounded-xl font-bold ios-button"
        >
          <span className="material-symbols-outlined">photo_library</span>
          <span>Galería</span>
        </button>
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 h-12 px-5 rounded-xl font-bold ios-button bg-[#13ec37] text-[#102213] shadow-lg shadow-[#13ec37]/30"
        >
          <span className="material-symbols-outlined">photo_camera</span>
          <span>Cámara</span>
        </button>
      </div>

      <input ref={fileInputRef} id="native-gallery-input" type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" />
      <input ref={cameraInputRef} id="native-camera-input" type="file" accept="image/*" capture="environment" onChange={handleCameraCapture} className="hidden" />

      {/* Floating badge para fotos capturadas y botón procesar */}
      {capturedImages.length > 0 && !showResults && !isProcessing && (
        <div className="mx-4 mb-4 flex flex-col gap-3 bg-[#19331e] p-4 rounded-xl border border-[#13ec37]/30 shadow-lg animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#13ec37]">imagesmode</span>
              <span className="font-bold text-sm text-white">
                {capturedImages.length} {capturedImages.length === 1 ? 'foto lista' : 'fotos listas'}
              </span>
            </div>
            <button
              onClick={() => setCapturedImages([])}
              className="px-3 py-1.5 border border-red-500/30 bg-red-500/10 text-red-500 rounded-lg text-xs font-bold"
            >
              Descartar todas
            </button>
          </div>

          <div className="flex gap-2 w-full mt-1">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 py-2.5 bg-[#13ec37]/20 border border-[#13ec37]/50 text-[#13ec37] rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[20px]">add_a_photo</span>
              Otra foto
            </button>
            <button
              onClick={processImages}
              className="flex-[1.5] py-2.5 bg-[#13ec37] text-[#102213] rounded-xl text-base font-black flex items-center justify-center gap-2 shadow-md shadow-[#13ec37]/20 active:scale-95 transition-transform"
            >
              Procesar IA <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* Empty state / placeholder */}
      {!isProcessing && capturedImages.length === 0 && !showResults && (
        <div className="flex-1 px-4 py-2">
          <div className="relative h-full min-h-[300px] rounded-3xl overflow-hidden border-2 border-[#13ec37]/20 bg-slate-900 border-dashed flex flex-col items-center justify-center opacity-40 p-6">
            <span className="material-symbols-outlined text-8xl mb-4 text-[#13ec37]">receipt_long</span>
            <p className="text-center text-lg">Toca en la cámara para escanear tickets y extraer los precios</p>
          </div>
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="mx-4 mt-8 p-6 bg-[#13ec37]/10 border border-[#13ec37]/20 rounded-xl text-center">
          <span className="material-symbols-outlined text-4xl text-[#13ec37] animate-spin mb-4 block mx-auto">progress_activity</span>
          <p className="text-[#13ec37] font-bold text-lg">Procesando imagen con IA...</p>
          <p className="text-[#13ec37]/70 text-sm mt-2">Buscando productos y precios</p>
        </div>
      )}

      {/* Error message global */}
      {error && (
        <div className="mx-4 mb-28 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
          <p className="text-red-400 text-center text-sm">{error}</p>
        </div>
      )}

      {/* Results Full-Screen Modal */}
      {showResults && scannedItems.length > 0 && (
        <div className="fixed inset-0 z-50 bg-[#102213] flex flex-col">
          {/* Header */}
          <header className="sticky top-0 bg-[#0a150c] px-4 py-3 border-b border-[#13ec37]/20 flex items-center justify-between z-10 shadow-md">
            <div>
              <h2 className="text-xl font-black text-white">Revisar Ticket</h2>
              <p className="text-[#92c99b] text-xs font-semibold">{scannedItems.length} productos detectados</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearResults}
                className="w-10 h-10 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center active:scale-90 transition-transform border border-red-500/20"
              >
                <span className="material-symbols-outlined font-bold">close</span>
              </button>
              <button
                onClick={handleSaveToDatabase}
                disabled={savedSuccess || isSaving || !selectedStore}
                className={`w-12 h-10 rounded-xl flex items-center justify-center active:scale-90 transition-transform ${savedSuccess ? 'bg-[#92c99b] text-[#102213]' :
                  selectedStore ? 'bg-[#13ec37] text-[#102213] shadow-[0_0_10px_rgba(19,236,55,0.3)] border border-[#13ec37]' :
                    'bg-[#92c99b]/10 text-[#92c99b]/30 cursor-not-allowed border border-[#92c99b]/20'
                  }`}
              >
                {isSaving ? (
                  <span className="material-symbols-outlined font-black animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined font-black">{savedSuccess ? 'check_circle' : 'check'}</span>
                )}
              </button>
            </div>
          </header>

          {savedSuccess && (
            <div className="bg-[#13ec37] text-[#102213] px-4 py-2 font-bold text-center flex items-center justify-center gap-2 text-sm animate-in slide-in-from-top-4">
              <span className="material-symbols-outlined text-base">task_alt</span>
              ¡Ticket guardado correctamente!
            </div>
          )}
          {!selectedStore && !savedSuccess && (
            <div className="bg-amber-500/10 text-amber-500 px-4 py-2 font-bold text-center flex items-center justify-center gap-2 text-sm animate-in slide-in-from-top-4">
              <span className="material-symbols-outlined text-base">warning</span>
              Elige un supermercado para poder guardar
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 pb-12">
            {/* Supermercado - Obligatorio */}
            <div className="mt-4 mb-6">
              <label className="text-xs font-bold text-[#92c99b] uppercase tracking-wider mb-2 block">Establecimiento</label>
              <button
                onClick={() => setShowStoreSelector(true)}
                className={`w-full p-4 rounded-2xl flex items-center justify-between shadow-sm active:scale-[98%] transition-transform ${selectedStore
                  ? "bg-[#19331e] border border-[#13ec37]/40"
                  : "bg-amber-500/10 border-2 border-amber-500/50 animate-pulse"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedStore ? 'bg-[#13ec37]/20' : 'bg-amber-500/20'}`}>
                    <span className={`material-symbols-outlined ${selectedStore ? 'text-[#13ec37]' : 'text-amber-500'}`}>storefront</span>
                  </div>
                  <div className="text-left">
                    <p className={`font-bold ${selectedStore ? "text-white text-lg" : "text-amber-400 text-base"}`}>
                      {selectedStore || "Toca para seleccionar..."}
                    </p>
                    {!selectedStore && (
                      <p className="text-[10px] text-amber-500/80 font-bold uppercase mt-0.5">Dato obligatorio</p>
                    )}
                  </div>
                </div>
                <span className="material-symbols-outlined text-[#92c99b]">edit</span>
              </button>
            </div>

            <label className="text-xs font-bold text-[#92c99b] uppercase tracking-wider mb-2 block">Productos a guardar</label>
            <div className="w-full bg-[#0a150c] rounded-2xl border border-[#13ec37]/20 overflow-hidden shadow-lg mb-6">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#19331e]/50 text-[10px] text-[#92c99b] uppercase tracking-wider border-b border-[#13ec37]/20">
                    <th className="py-3 px-3 font-bold text-left">Artículo</th>
                    <th className="py-3 px-1 font-bold text-right">Cant / Und</th>
                    <th className="py-3 px-2 font-bold text-right pt-2 pb-2">Total</th>
                    <th className="py-3 px-1 w-[8%] text-center"></th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {scannedItems.map((item, index) => {
                    const displayedMother = item.matchedProductName || item.customName || item.canonicalName || item.productName;
                    return (
                      <tr key={index} className="border-b border-[#13ec37]/10 last:border-0 hover:bg-[#19331e] transition-colors relative">
                        <td className="py-3 px-3 align-top min-w-[35%] max-w-[45%] overflow-hidden">
                          {/* Editable Mother Article trigger */}
                          <div
                            onClick={() => { setEditingItemIndex(index); setShowProductMatcher(true); }}
                            className="group cursor-pointer"
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <p className={`text-sm font-black leading-tight truncate ${item.matchedProductId ? 'text-[#13ec37]' : 'text-amber-400'}`}>
                                {displayedMother}
                              </p>
                              <span className="material-symbols-outlined text-[14px] text-white/20 group-hover:text-white/80 shrink-0">edit</span>
                            </div>
                            <p className="font-medium text-[10px] leading-tight line-clamp-1 text-white/50">{item.productName}</p>
                            <div className="mt-1.5 flex gap-1 flex-wrap">
                              {!item.matchedProductId && (
                                <span className="text-[8px] bg-amber-400/20 border border-amber-400/30 text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase">Nuevo catál.</span>
                              )}
                              {item.matchedProductId && (
                                <span className="text-[8px] bg-[#13ec37]/10 border border-[#13ec37]/20 text-[#13ec37] px-1.5 py-0.5 rounded font-bold uppercase">Exist.</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-1 text-right align-top">
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-1">
                              <input
                                title="Cantidad"
                                type="number"
                                step="any"
                                value={item.quantity || 1}
                                onChange={(e) => {
                                  const q = parseFloat(e.target.value) || 0;
                                  setScannedItems(items => items.map((it, i) => i === index ? { ...it, quantity: q, price: Math.round(q * it.unitPrice * 100) / 100 } : it));
                                }}
                                className="w-10 text-[11px] bg-[#19331e] border border-white/20 text-white font-medium text-center p-1 rounded focus:outline-none focus:border-[#13ec37]"
                              />
                              <span className="text-white/40 text-[10px]">x</span>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <input
                                title="Precio Unitario"
                                type="number"
                                step="0.01"
                                value={item.unitPrice || item.price}
                                onChange={(e) => {
                                  const up = parseFloat(e.target.value) || 0;
                                  setScannedItems(items => items.map((it, i) => i === index ? { ...it, unitPrice: up, price: Math.round(it.quantity * up * 100) / 100 } : it));
                                }}
                                className="w-12 text-[11px] bg-[#19331e] border border-[#13ec37]/30 text-[#13ec37] font-bold text-right p-1 rounded focus:outline-none focus:border-[#13ec37]"
                              />
                              <span className="text-[#13ec37]/70 font-bold text-[10px]">€</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right align-top">
                          {/* Inline editable price input */}
                          <div className="flex items-center justify-end h-full mt-2">
                            <input
                              title="Precio Total"
                              type="number"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => {
                                const t = parseFloat(e.target.value) || 0;
                                const u = item.quantity ? t / item.quantity : t;
                                setScannedItems(items => items.map((it, i) => i === index ? { ...it, price: t, unitPrice: Math.round(u * 100) / 100 } : it));
                              }}
                              className="w-12 bg-transparent border-none p-0 text-[#13ec37] font-black text-right focus:outline-none focus:ring-0 text-base"
                            />
                            <span className="text-[#13ec37] font-black ml-0.5 text-base">€</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center align-top">
                          {/* Button to remove item easily */}
                          <button
                            title="Eliminar registro"
                            onClick={() => {
                              setScannedItems(items => items.filter((_, i) => i !== index));
                              if (scannedItems.length === 1) clearResults();
                            }}
                            className="text-white/20 hover:text-red-500 p-1.5 transition-colors mt-0.5"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="bg-[#19331e] p-4 border-t border-[#13ec37]/20 flex justify-between items-center">
                <span className="text-[#92c99b] text-sm uppercase font-bold tracking-wider">Total Calculado</span>
                <span className="text-2xl font-black text-white">{total.toFixed(2)}€</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Store selector modal */}
      {showStoreSelector && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowStoreSelector(false)} />
          <div className="relative w-full max-w-md bg-[#102213] rounded-t-3xl border-t border-[#13ec37]/10 safe-area-bottom">
            <button className="flex h-8 w-full items-center justify-center" onClick={() => setShowStoreSelector(false)}>
              <div className="h-1.5 w-12 rounded-full bg-[#13ec37]/30"></div>
            </button>
            <div className="px-6 pb-6 max-h-[60vh] overflow-y-auto">
              <h2 className="text-lg font-bold mb-1">Supermercado (obligatorio)</h2>
              <p className="text-sm text-[#92c99b]/80 mb-4">
                Cambia el propuesto, elige uno existente o añade uno nuevo
              </p>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  placeholder="Nueva tienda..."
                  className="flex-1 px-4 py-3 bg-[#19331e] border border-[#13ec37]/20 rounded-xl text-white placeholder:text-[#92c99b]/50"
                />
                <button
                  onClick={handleCreateStore}
                  disabled={!newStoreName.trim()}
                  className="px-4 py-3 bg-[#13ec37] text-[#102213] rounded-xl font-bold disabled:opacity-50"
                >
                  Crear
                </button>
              </div>

              {availableStores.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-[#92c99b]/60 uppercase tracking-wider mb-2">Tiendas guardadas</p>
                  {availableStores.map((store, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectStore(store)}
                      className={`w-full p-3 rounded-xl text-left flex items-center gap-3 ${selectedStore === store
                        ? 'bg-[#13ec37]/20 border border-[#13ec37]'
                        : 'bg-[#19331e] border border-[#13ec37]/10'
                        }`}
                    >
                      <span className="material-symbols-outlined text-[#13ec37]">store</span>
                      <span>{store}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Product matcher modal */}
      {showProductMatcher && currentEditingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => { setShowProductMatcher(false); setEditingItemIndex(null); }} />
          <div className="relative w-full max-w-md bg-[#102213] rounded-2xl border border-[#13ec37]/20 max-h-[80vh] overflow-hidden">
            <div className="sticky top-0 bg-[#102213] p-4 border-b border-[#13ec37]/10">
              <h2 className="text-lg font-bold">Vincular Producto</h2>
              <p className="text-sm text-[#92c99b]/60 mt-1">&quot;{currentEditingItem.productName}&quot;</p>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {/* Sugerencias */}
              {currentEditingItem.suggestions && currentEditingItem.suggestions.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-[#92c99b]/60 uppercase tracking-wider mb-2">Productos similares</p>
                  {currentEditingItem.suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => handleMatchProduct(editingItemIndex!, suggestion)}
                      className={`w-full p-3 mb-2 rounded-xl text-left flex items-center justify-between ${currentEditingItem.matchedProductId === suggestion.id
                        ? 'bg-[#13ec37]/20 border border-[#13ec37]'
                        : 'bg-[#19331e] border border-[#13ec37]/10'
                        }`}
                    >
                      <div>
                        <p className="font-semibold">{suggestion.name}</p>
                        <p className="text-xs text-[#92c99b]/60">{Math.round(suggestion.similarity * 100)}% similar</p>
                      </div>
                      <span className="material-symbols-outlined text-[#13ec37]">link</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Crear como nuevo */}
              <div className="border-t border-[#13ec37]/10 pt-4">
                <p className="text-xs text-[#92c99b]/60 uppercase tracking-wider mb-2">O crear como nuevo producto</p>
                <input
                  type="text"
                  defaultValue={currentEditingItem.customName || currentEditingItem.canonicalName || currentEditingItem.productName}
                  placeholder="Nombre del artículo madre..."
                  className="w-full px-4 py-3 mb-3 bg-[#19331e] border border-[#13ec37]/20 rounded-xl text-white"
                  id="customProductName"
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('customProductName') as HTMLInputElement;
                    handleSetAsNewProduct(editingItemIndex!, input?.value);
                  }}
                  className="w-full py-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-semibold"
                >
                  <span className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">add_circle</span>
                    Crear nuevo producto
                  </span>
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-[#13ec37]/10">
              <button
                onClick={() => { setShowProductMatcher(false); setEditingItemIndex(null); }}
                className="w-full py-3 bg-[#19331e] text-white rounded-xl font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="h-24"></div>
    </div>
  );
}
