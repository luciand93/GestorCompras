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
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [invertColors, setInvertColors] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Para selector de tienda
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [newStoreName, setNewStoreName] = useState("");
  const [availableStores, setAvailableStores] = useState<string[]>([]);

  // Para vinculación de productos
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [showProductMatcher, setShowProductMatcher] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    loadStores();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const loadStores = async () => {
    const stores = await getStores();
    setAvailableStores(stores);
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      setError(null);

      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        cameraInputRef.current?.click();
        return;
      }

      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setShowCamera(true);
      setShowResults(false);
      setScannedItems([]);
      setSavedSuccess(false);
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      cameraInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg", 0.8);
      // Agregar la foto a la lista en lugar de procesar inmediatamente
      setCapturedImages(prev => [...prev, imageData]);

      // Feedback visual rápido
      videoRef.current.style.opacity = '0.5';
      setTimeout(() => {
        if (videoRef.current) videoRef.current.style.opacity = '1';
      }, 150);
    }
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

    // Detener la cámara si está encendida
    stopCamera();

    try {
      const optimizedImages = await Promise.all(
        capturedImages.map(img =>
          imageProcessor.processImage(img, {
            maxWidth: 512,
            maxHeight: 640,
            quality: 0.4,
            grayscale: true,
            contrast: 1.5,
            invert: invertColors
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

    const itemsToSave = scannedItems.map(item => ({
      productName: item.customName || item.matchedProductName || item.canonicalName || item.productName,
      price: item.price,
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
          onClick={showCamera ? stopCamera : startCamera}
          className={`flex-1 flex items-center justify-center gap-2 h-12 px-5 rounded-xl font-bold ios-button ${showCamera
            ? 'bg-red-500 text-white'
            : 'bg-[#13ec37] text-[#102213] shadow-lg shadow-[#13ec37]/30'
            }`}
        >
          <span className="material-symbols-outlined">{showCamera ? 'close' : 'photo_camera'}</span>
          <span>{showCamera ? 'Cerrar' : 'Cámara'}</span>
        </button>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleCameraCapture} className="hidden" />

      {/* Floating badge para fotos capturadas y botón procesar */}
      {capturedImages.length > 0 && !showResults && !isProcessing && (
        <div className="mx-4 mb-4 flex items-center justify-between bg-[#19331e] p-3 rounded-xl border border-[#13ec37]/30 shadow-lg animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#13ec37]">imagesmode</span>
            <span className="font-bold text-sm text-white">
              {capturedImages.length} {capturedImages.length === 1 ? 'foto lista' : 'fotos listas'}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCapturedImages([])}
              className="px-3 py-1.5 bg-red-500/20 text-red-500 rounded-lg text-xs font-bold"
            >
              Borrar
            </button>
            <button
              onClick={processImages}
              className="px-4 py-1.5 bg-[#13ec37] text-[#102213] rounded-lg text-sm font-black flex items-center gap-1 shadow-md shadow-[#13ec37]/20"
            >
              Procesar <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* Camera viewfinder */}
      <div className="flex-1 px-4 py-2">
        <div className="relative h-full min-h-[300px] rounded-3xl overflow-hidden border-2 border-[#13ec37]/20 bg-slate-900">
          {showCamera ? (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-80 border-2 border-dashed border-[#13ec37]/50 rounded-xl relative">
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#13ec37] rounded-tl-md"></div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#13ec37] rounded-tr-md"></div>
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#13ec37] rounded-bl-md"></div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#13ec37] rounded-br-md"></div>
                  {isProcessing && <div className="scanning-line"></div>}
                </div>
              </div>

              <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-8 z-20">
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center rounded-full w-12 h-12 bg-black/50 text-white backdrop-blur-md">
                  <span className="material-symbols-outlined">photo_library</span>
                </button>

                <button onClick={capturePhoto} disabled={isProcessing} className="flex flex-col items-center justify-center rounded-full w-20 h-20 bg-[#13ec37]/20 border-4 border-white p-1 backdrop-blur-sm ios-button relative">
                  <div className={`bg-white rounded-full w-full h-full flex items-center justify-center ${isProcessing ? 'animate-pulse' : ''}`}>
                    {isProcessing ? (
                      <span className="material-symbols-outlined text-3xl text-[#102213] animate-spin">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined text-4xl text-[#102213]" style={{ fontVariationSettings: "'FILL' 1" }}>camera</span>
                    )}
                  </div>
                  {capturedImages.length > 0 && !isProcessing && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#102213]">
                      {capturedImages.length}
                    </div>
                  )}
                </button>

                <button onClick={() => setInvertColors(!invertColors)} className={`flex items-center justify-center rounded-full w-12 h-12 backdrop-blur-md ${invertColors ? 'bg-[#13ec37] text-[#102213]' : 'bg-black/50 text-white'}`}>
                  <span className="material-symbols-outlined">invert_colors</span>
                </button>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40 p-6">
              <span className="material-symbols-outlined text-8xl mb-4">receipt_long</span>
              <p className="text-center text-lg">Escanea un ticket de compra para extraer los precios</p>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/20 p-6">
              <span className="material-symbols-outlined text-4xl text-red-500 mb-4">error</span>
              <p className="text-center text-red-400">{cameraError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && !showCamera && (
        <div className="mx-4 mb-28 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
          <p className="text-red-400 text-center text-sm">{error}</p>
        </div>
      )}

      {/* Results bottom sheet */}
      {showResults && scannedItems.length > 0 && (
        <div className="bg-[#102213] rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.5)] border-t border-[#13ec37]/10">
          <button className="flex h-8 w-full items-center justify-center" onClick={() => setShowResults(!showResults)}>
            <div className="h-1.5 w-12 rounded-full bg-[#13ec37]/40"></div>
          </button>

          <div className="px-4 pb-6 max-h-[60vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Productos Detectados</h3>
              <div className="flex items-center gap-2">
                <span className="bg-[#13ec37]/20 text-[#13ec37] text-xs font-bold px-2 py-1 rounded">
                  {scannedItems.length}
                </span>
                <button onClick={clearResults} className="text-[#92c99b] p-1">
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
            </div>

            {/* Supermercado - Obligatorio */}
            <button
              onClick={() => setShowStoreSelector(true)}
              className={`w-full mb-4 p-3 rounded-xl flex items-center justify-between ios-button ${selectedStore
                ? "bg-[#19331e] border border-[#13ec37]/20"
                : "bg-amber-500/10 border-2 border-amber-500/50"
                }`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#13ec37]">store</span>
                <span className={`text-sm ${selectedStore ? "text-white" : "text-amber-400"}`}>
                  {selectedStore || "Requerido: Seleccionar supermercado"}
                </span>
                {!selectedStore && (
                  <span className="text-[10px] bg-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded uppercase">
                    Obligatorio
                  </span>
                )}
              </div>
              <span className="material-symbols-outlined text-[#92c99b]">chevron_right</span>
            </button>

            <div className="overflow-x-auto w-full mb-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#13ec37]/20 text-xs text-[#92c99b]">
                    <th className="py-2 px-1 font-normal w-[35%]">Original Ticket</th>
                    <th className="py-2 px-1 font-normal w-[35%]">Artíc. Madre</th>
                    <th className="py-2 px-1 font-normal w-[15%] text-right">Precio</th>
                    <th className="py-2 px-1 font-normal w-[15%] text-center">Mod</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {scannedItems.map((item, index) => {
                    const displayedMother = item.matchedProductName || item.customName || item.canonicalName || item.productName;
                    return (
                      <tr key={index} className="border-b border-[#13ec37]/10 last:border-0 hover:bg-[#13ec37]/5 transition-colors">
                        <td className="py-3 px-1 align-top">
                          <p className="font-semibold text-xs leading-tight line-clamp-2 text-white/80">{item.productName}</p>
                        </td>
                        <td className="py-3 px-1 align-top">
                          <p className={`text-xs font-bold leading-tight ${item.matchedProductId ? 'text-[#13ec37]' : 'text-amber-400'}`}>
                            {displayedMother}
                          </p>
                          {!item.matchedProductId && (
                            <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1 rounded uppercase mt-1 inline-block">Nuevo</span>
                          )}
                          {item.matchedProductId && (
                            <span className="text-[9px] bg-[#13ec37]/20 text-[#13ec37] px-1 rounded uppercase mt-1 inline-block">Vinculado</span>
                          )}
                        </td>
                        <td className="py-3 px-1 text-right text-[#13ec37] font-bold align-top">
                          {item.price.toFixed(2)}€
                        </td>
                        <td className="py-3 px-1 text-center align-top">
                          <button
                            onClick={() => { setEditingItemIndex(index); setShowProductMatcher(true); }}
                            className="text-[#92c99b] p-2 bg-[#13ec37]/10 rounded-lg active:scale-95 transition-transform"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 pt-4 border-t border-[#13ec37]/10 flex justify-between items-center">
              <span className="text-[#92c99b] font-medium">Total</span>
              <span className="text-xl font-black">{total.toFixed(2)}€</span>
            </div>

            <button
              onClick={handleSaveToDatabase}
              disabled={savedSuccess || !selectedStore}
              className={`w-full mt-4 font-bold py-3 rounded-xl ios-button ${savedSuccess
                ? "bg-[#92c99b] text-[#102213]"
                : selectedStore
                  ? "bg-[#13ec37] text-[#102213] shadow-lg"
                  : "bg-[#92c99b]/30 text-[#92c99b]/60 cursor-not-allowed"
                }`}
            >
              {savedSuccess ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">check_circle</span>
                  ¡Guardado!
                </span>
              ) : !selectedStore ? (
                "Selecciona un supermercado para guardar"
              ) : (
                "Guardar precios"
              )}
            </button>
          </div>

          <div className="h-24"></div>
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

      {/* Processing indicator */}
      {isProcessing && !showCamera && (
        <div className="mx-4 mb-28 p-6 bg-[#13ec37]/10 border border-[#13ec37]/20 rounded-xl text-center">
          <span className="material-symbols-outlined text-4xl text-[#13ec37] animate-spin mb-2">progress_activity</span>
          <p className="text-[#13ec37] font-medium">Procesando imagen con IA...</p>
        </div>
      )}

      <div className="h-24"></div>
    </div>
  );
}
