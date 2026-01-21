"use client";

import { useState, useRef } from "react";
import { Camera, Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { scanReceiptImage } from "@/utils/ai-scanner";
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await processImage(file);
  };

  const processImage = async (file: File | Blob) => {
    setIsScanning(true);
    setError(null);
    setSuccess(false);
    setResult(null);

    try {
      // Escanear imagen con Gemini
      const scanResult = await scanReceiptImage(file);
      setResult(scanResult.items);

      // Guardar en Supabase
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
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Cámara trasera en móvil
      });
      setStream(mediaStream);
      setShowCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("No se pudo acceder a la cámara");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        processImage(blob);
        stopCamera();
      }
    }, "image/jpeg", 0.9);
  };

  return (
    <div className="space-y-6 mb-24">
      {/* Controles de escaneo */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
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
                <Camera className="mr-2 h-5 w-5" />
                {showCamera ? "Cerrar Cámara" : "Abrir Cámara"}
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Vista de cámara */}
      {showCamera && (
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
              />
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <Button
                  onClick={capturePhoto}
                  size="lg"
                  className="h-16 w-16 rounded-full shadow-lg"
                >
                  <Camera className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado de carga */}
      {isScanning && (
        <Card>
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-muted-foreground">
              Procesando imagen con IA...
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
                <p className="font-medium text-green-500">
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
                  className="flex justify-between items-center p-3 bg-muted rounded-md"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.unit_price && (
                      <p className="text-xs text-muted-foreground">
                        {item.unit_price.toFixed(2)}€/unidad
                      </p>
                    )}
                  </div>
                  <p className="font-semibold text-lg">
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
