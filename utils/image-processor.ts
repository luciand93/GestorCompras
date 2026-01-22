/**
 * Utilidades para procesar imágenes antes de enviarlas a la IA
 * - Reduce resolución agresivamente
 * - Convierte a escala de grises
 * - Aumenta contraste
 * - Comprime al máximo
 */

export interface ImageProcessOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  grayscale?: boolean;
  invert?: boolean;
  contrast?: number;
}

/**
 * Procesa una imagen base64 para optimizarla para OCR
 */
async function processImage(
  imageBase64: string,
  options: ImageProcessOptions = {}
): Promise<string> {
  const {
    maxWidth = 640,       // Reducido de 800 a 640
    maxHeight = 800,      // Reducido de 1200 a 800
    quality = 0.5,        // Reducido de 0.6 a 0.5
    grayscale = true,
    invert = false,
    contrast = 1.4,       // Aumentado para mejor legibilidad
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      // Calcular nuevas dimensiones manteniendo proporción
      let { width, height } = img;
      
      // Reducir agresivamente
      const scale = Math.min(maxWidth / width, maxHeight / height, 1);
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      // Crear canvas
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

      // Procesar píxeles
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Escala de grises
        if (grayscale) {
          const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          r = g = b = gray;
        }

        // Contraste
        if (contrast !== 1.0) {
          const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
          r = Math.min(255, Math.max(0, factor * (r - 128) + 128));
          g = Math.min(255, Math.max(0, factor * (g - 128) + 128));
          b = Math.min(255, Math.max(0, factor * (b - 128) + 128));
        }

        // Invertir (negativo)
        if (invert) {
          r = 255 - r;
          g = 255 - g;
          b = 255 - b;
        }

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }

      ctx.putImageData(imageData, 0, 0);

      // Exportar como JPEG comprimido
      const result = canvas.toDataURL('image/jpeg', quality);
      
      console.log(`Imagen procesada: ${width}x${height}, ~${Math.round(result.length * 0.75 / 1024)}KB`);
      
      resolve(result);
    };

    img.onerror = () => reject(new Error('Error al cargar imagen'));
    img.src = imageBase64;
  });
}

/**
 * Formatea el tamaño de archivo para mostrar
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Exportar como objeto para mantener compatibilidad
const imageProcessor = {
  processImage,
  formatFileSize,
};

export default imageProcessor;
export { processImage, formatFileSize };
