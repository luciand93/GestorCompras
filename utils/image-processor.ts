/**
 * Utilidades para procesar imágenes antes de enviarlas a la IA
 * - Reduce resolución
 * - Convierte a escala de grises
 * - Aumenta contraste
 * - Comprime
 */

export interface ProcessedImage {
  base64: string;
  mimeType: string;
  width: number;
  height: number;
  originalSize: number;
  processedSize: number;
}

/**
 * Procesa una imagen para optimizarla para OCR
 * @param file - Archivo de imagen o Blob
 * @param options - Opciones de procesamiento
 */
export async function processImageForOCR(
  file: File | Blob,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    grayscale?: boolean;
    invert?: boolean;
    contrast?: number;
  } = {}
): Promise<ProcessedImage> {
  const {
    maxWidth = 800,      // Resolución máxima ancho
    maxHeight = 1200,    // Resolución máxima alto
    quality = 0.6,       // Calidad JPEG (0.0 - 1.0)
    grayscale = true,    // Convertir a escala de grises
    invert = false,      // Invertir colores (negativo)
    contrast = 1.3,      // Aumentar contraste (1.0 = normal)
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const originalSize = file.size;

    img.onload = () => {
      // Calcular nuevas dimensiones manteniendo proporción
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      // Redondear dimensiones
      width = Math.round(width);
      height = Math.round(height);

      // Crear canvas para procesar
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo crear contexto de canvas'));
        return;
      }

      // Dibujar imagen redimensionada
      ctx.drawImage(img, 0, 0, width, height);

      // Obtener datos de píxeles para procesamiento
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Procesar cada píxel
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Convertir a escala de grises
        if (grayscale) {
          const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          r = g = b = gray;
        }

        // Aplicar contraste
        if (contrast !== 1.0) {
          const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
          r = Math.min(255, Math.max(0, factor * (r - 128) + 128));
          g = Math.min(255, Math.max(0, factor * (g - 128) + 128));
          b = Math.min(255, Math.max(0, factor * (b - 128) + 128));
        }

        // Invertir colores (negativo)
        if (invert) {
          r = 255 - r;
          g = 255 - g;
          b = 255 - b;
        }

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }

      // Aplicar cambios
      ctx.putImageData(imageData, 0, 0);

      // Convertir a base64 con compresión JPEG
      const base64 = canvas.toDataURL('image/jpeg', quality);
      
      // Calcular tamaño aproximado del resultado
      const processedSize = Math.round((base64.length - 'data:image/jpeg;base64,'.length) * 0.75);

      resolve({
        base64,
        mimeType: 'image/jpeg',
        width,
        height,
        originalSize,
        processedSize,
      });
    };

    img.onerror = () => {
      reject(new Error('Error al cargar la imagen'));
    };

    // Cargar imagen desde File/Blob
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Formatea el tamaño de archivo para mostrar
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
