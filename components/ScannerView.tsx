"use client";

import { useState, useRef, useEffect } from "react";
import { scanReceiptImage, type ScannedPrice } from "@/utils/ai-scanner";
import { saveScannedPrices } from "@/app/actions/scanner";
import imageProcessor from "@/utils/image-processor";

export function ScannerView() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedPrice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [invertColors, setInvertColors] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setCameraError(null);
      setError(null);
      
      // En móvil, usar input con capture es más fiable
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        cameraInputRef.current?.click();
        return;
      }
      
      // En desktop, usar getUserMedia
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
      // Fallback: usar input file con capture
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
      stopCamera();
      await processImage(imageData);
    }
  };

  // Para seleccionar de galería (sin capture)
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target?.result as string;
      await processImage(imageData);
    };
    reader.readAsDataURL(file);
    
    // Limpiar input para permitir seleccionar el mismo archivo
    e.target.value = '';
  };

  // Para cámara directa (con capture)
  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target?.result as string;
      await processImage(imageData);
    };
    reader.readAsDataURL(file);
    
    e.target.value = '';
  };

  const processImage = async (imageData: string) => {
    setIsProcessing(true);
    setError(null);
    setSavedSuccess(false);
    setShowResults(false);

    try {
      // Imagen muy reducida para ahorrar tokens de API
      const optimizedImage = await imageProcessor.processImage(imageData, {
        maxWidth: 512,
        maxHeight: 640,
        quality: 0.4,
        grayscale: true,
        contrast: 1.5,
        invert: invertColors
      });

      const result = await scanReceiptImage(optimizedImage);

      if (result.error) {
        setError(result.error);
        setScannedItems([]);
      } else if (result.prices && result.prices.length > 0) {
        setScannedItems(result.prices);
        setShowResults(true);
      } else {
        setError("No se detectaron productos. Intenta con mejor iluminación.");
      }
    } catch (err: any) {
      setError(err.message || "Error desconocido");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (scannedItems.length === 0) return;

    const result = await saveScannedPrices(scannedItems);

    if (result.success) {
      setSavedSuccess(true);
    } else {
      setError("Error al guardar");
    }
  };

  const total = scannedItems.reduce((sum, item) => sum + item.price, 0);

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
          className={`flex-1 flex items-center justify-center gap-2 h-12 px-5 rounded-xl font-bold ios-button ${
            showCamera 
              ? 'bg-red-500 text-white' 
              : 'bg-[#13ec37] text-[#102213] shadow-lg shadow-[#13ec37]/30'
          }`}
        >
          <span className="material-symbols-outlined">{showCamera ? 'close' : 'photo_camera'}</span>
          <span>{showCamera ? 'Cerrar' : 'Cámara'}</span>
        </button>
      </div>

      {/* Input para galería (sin capture) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleGalleryUpload}
        className="hidden"
      />
      
      {/* Input para cámara directa (con capture) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        className="hidden"
      />

      {/* Camera viewfinder */}
      <div className="flex-1 px-4 py-2">
        <div className="relative h-full min-h-[300px] rounded-3xl overflow-hidden border-2 border-[#13ec37]/20 bg-slate-900">
          {showCamera ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-80 border-2 border-dashed border-[#13ec37]/50 rounded-xl relative">
                  {/* Corner brackets */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#13ec37] rounded-tl-md"></div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#13ec37] rounded-tr-md"></div>
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#13ec37] rounded-bl-md"></div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#13ec37] rounded-br-md"></div>
                  
                  {isProcessing && <div className="scanning-line"></div>}
                </div>
              </div>

              {/* Camera controls */}
              <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-8 z-20">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center rounded-full w-12 h-12 bg-black/50 text-white backdrop-blur-md"
                >
                  <span className="material-symbols-outlined">photo_library</span>
                </button>
                
                <button
                  onClick={capturePhoto}
                  disabled={isProcessing}
                  className="flex items-center justify-center rounded-full w-20 h-20 bg-[#13ec37]/20 border-4 border-white p-1 backdrop-blur-sm ios-button"
                >
                  <div className={`bg-white rounded-full w-full h-full flex items-center justify-center ${isProcessing ? 'animate-pulse' : ''}`}>
                    {isProcessing ? (
                      <span className="material-symbols-outlined text-3xl text-[#102213] animate-spin">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined text-4xl text-[#102213]" style={{ fontVariationSettings: "'FILL' 1" }}>circle</span>
                    )}
                  </div>
                </button>
                
                <button
                  onClick={() => setInvertColors(!invertColors)}
                  className={`flex items-center justify-center rounded-full w-12 h-12 backdrop-blur-md ${invertColors ? 'bg-[#13ec37] text-[#102213]' : 'bg-black/50 text-white'}`}
                >
                  <span className="material-symbols-outlined">invert_colors</span>
                </button>
              </div>
            </>
          ) : (
            // Placeholder state
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
        <div className="mx-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
          <p className="text-red-400 text-center">{error}</p>
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
              <h3 className="text-lg font-bold">Resultados Extraídos</h3>
              <span className="bg-[#13ec37]/20 text-[#13ec37] text-xs font-bold px-2 py-1 rounded">
                {scannedItems.length} Detectados
              </span>
            </div>
            
            <div className="space-y-3">
              {scannedItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-[#13ec37]/5 border border-[#13ec37]/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#13ec37]/10 flex items-center justify-center text-[#13ec37]">
                      <span className="material-symbols-outlined">local_mall</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{item.productName}</p>
                      <p className="text-[#92c99b] text-xs">{item.store || 'Tienda no identificada'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[#13ec37] font-bold text-lg">{item.price.toFixed(2)}€</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-6 pt-4 border-t border-[#13ec37]/10 flex justify-between items-center">
              <span className="text-[#92c99b] font-medium">Total Detectado</span>
              <span className="text-xl font-black">{total.toFixed(2)}€</span>
            </div>

            {/* Save button */}
            <button
              onClick={handleSaveToDatabase}
              disabled={savedSuccess}
              className={`w-full mt-4 font-bold py-3 rounded-xl ios-button ${
                savedSuccess 
                  ? 'bg-[#92c99b] text-[#102213]' 
                  : 'bg-[#13ec37] text-[#102213] shadow-lg'
              }`}
            >
              {savedSuccess ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">check_circle</span>
                  Guardado en base de datos
                </span>
              ) : (
                'Guardar precios'
              )}
            </button>
          </div>
          
          <div className="h-24"></div>
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && !showCamera && (
        <div className="mx-4 mb-4 p-6 bg-[#13ec37]/10 border border-[#13ec37]/20 rounded-xl text-center">
          <span className="material-symbols-outlined text-4xl text-[#13ec37] animate-spin mb-2">progress_activity</span>
          <p className="text-[#13ec37] font-medium">Procesando imagen con IA...</p>
        </div>
      )}
    </div>
  );
}
