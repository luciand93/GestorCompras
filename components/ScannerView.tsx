"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Upload, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { scanReceiptImage, isGeminiConfigured } from "@/utils/ai-scanner";
import { saveScannedPrices } from "@/app/actions/scanner";
import type { ScannedItem } from "@/utils/ai-scanner";

export function ScannerView() {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScannedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Limpiar stream al desmontar
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Asignar stream al video cuando cambie
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, showCamera]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processImage(file);
    // Limpiar input para permitir seleccionar el mismo archivo
    e.target.value = '';
  };

  const processImage = async (file: File | Blob) => {
    // Verificar si Gemini está configurado
    if (!isGeminiConfigured()) {
      setError("La API de Gemini no está configurada. Contacta al administrador.");
      return;
    }

    setIsScanning(true);
    setError(null);
    setSuccess(false);
    setResult(null);

    try {
      const scanResult = await scanReceiptImage(file);
      setResult(scanResult.items);

      await saveScannedPrices(
        scanResult.items,
        scanResult.supermarket,
        scanResult.date
      );

      setSuccess(true);
    } catch (err) {
      console.error("Error scanning image:", err);
      setError(
        err instanceof Error ? err.message : "Error al procesar la imagen"
      );
    } finally {
      setIsScanning(false);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    
    // Verificar si el navegador soporta getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Tu navegador no soporta acceso a la cámara. Usa el botón 'Subir Foto' en su lugar.");
      return;
    }

    try {
      // Intentar con cámara trasera primero (mejor para escanear tickets)
      const constraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setShowCamera(true);
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Permiso de cámara denegado. Por favor, permite el acceso a la cámara en la configuración de tu navegador.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("No se encontró ninguna cámara en tu dispositivo.");
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setCameraError("La cámara está siendo usada por otra aplicación.");
      } else {
        setCameraError("No se pudo acceder a la cámara. Usa el botón 'Subir Foto' en su lugar.");
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCamera(false);
    setCameraError(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          processImage(blob);
          stopCamera();
        }
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <div className="space-y-6 mb-24">
      {/* Controles de escaneo */}
      <Card className="shadow-md">
        <CardContent className="p-6">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center mb-4">
              Sube o toma una foto de tu ticket de compra para extraer los precios automáticamente
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className="flex-1 h-14"
                variant="outline"
              >
                <Upload className="mr-2 h-5 w-5" />
                Subir Foto
              </Button>
              <Button
                onClick={showCamera ? stopCamera : startCamera}
                disabled={isScanning}
                className="flex-1 h-14"
              >
                {showCamera ? (
                  <>
                    <X className="mr-2 h-5 w-5" />
                    Cerrar
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-5 w-5" />
                    Cámara
                  </>
                )}
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Error de cámara */}
      {cameraError && (
        <Card className="border-amber-500">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-600">Problema con la cámara</p>
                <p className="text-sm text-muted-foreground">{cameraError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vista de cámara */}
      {showCamera && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-[4/3] object-cover"
              />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <Button
                  onClick={capturePhoto}
                  size="lg"
                  className="h-16 w-16 rounded-full shadow-lg bg-white hover:bg-gray-100"
                >
                  <Camera className="h-8 w-8 text-gray-900" />
                </Button>
              </div>
              <button
                onClick={stopCamera}
                className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado de carga */}
      {isScanning && (
        <Card>
          <CardContent className="p-6 text-center">
            <Loader2 className="h-10 w-10 animate-spin mx-auto mb-3 text-primary" />
            <p className="text-muted-foreground font-medium">
              Analizando imagen con IA...
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Esto puede tardar unos segundos
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Error</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Éxito */}
      {success && result && (
        <Card className="border-green-500">
          <CardContent className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-600">
                  ¡Escaneo completado!
                </p>
                <p className="text-sm text-muted-foreground">
                  {result.length} productos extraídos y guardados
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {result.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 bg-muted rounded-lg"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.unit_price && (
                      <p className="text-xs text-muted-foreground">
                        {item.unit_price.toFixed(2)}€/unidad
                      </p>
                    )}
                  </div>
                  <p className="font-bold text-lg text-green-600">
                    {item.price.toFixed(2)}€
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
