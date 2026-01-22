import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

// Crear cliente solo si hay API key
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export interface ScannedPrice {
  productName: string;
  price: number;
  store?: string;
}

export interface ScanResult {
  prices: ScannedPrice[];
  error?: string;
}

/**
 * Verifica si la API de Gemini está configurada
 */
export function isGeminiConfigured(): boolean {
  return !!apiKey && !!genAI;
}

// Modelos disponibles que soportan imágenes (verificados)
// https://ai.google.dev/models/gemini
const MODELS_TO_TRY = [
  'gemini-1.5-flash',           // Modelo principal flash
  'gemini-1.5-flash-latest',    // Alias a la última versión
  'gemini-1.5-pro',             // Modelo pro (más capacidad)
  'gemini-1.5-pro-latest',      // Alias pro
  'gemini-pro-vision',          // Modelo vision legacy
];

/**
 * Escanea una imagen de ticket/producto usando Gemini AI
 * @param imageBase64 - Imagen en base64
 * @returns Resultado estructurado con precios
 */
export async function scanReceiptImage(imageBase64: string): Promise<ScanResult> {
  // Verificar si Gemini está configurado
  if (!genAI) {
    return {
      prices: [],
      error: 'La API de Gemini no está configurada. Añade NEXT_PUBLIC_GEMINI_API_KEY en .env.local'
    };
  }

  const prompt = `Analiza esta imagen de ticket de compra y extrae los productos con sus precios.

Responde ÚNICAMENTE con un JSON válido en este formato exacto:
{
  "store": "nombre de la tienda",
  "products": [
    {"name": "producto 1", "price": 1.23},
    {"name": "producto 2", "price": 4.56}
  ]
}

REGLAS:
- Solo JSON, sin markdown, sin explicaciones
- Precios como números decimales (usa punto, no coma)
- Si no identificas la tienda, usa "Tienda"
- Extrae TODOS los productos visibles`;

  // Preparar la imagen
  const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp|gif);base64,/, '');
  const mimeMatch = imageBase64.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,/);
  const mimeType = mimeMatch ? `image/${mimeMatch[1] === 'jpg' ? 'jpeg' : mimeMatch[1]}` : 'image/jpeg';
  
  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType: mimeType,
    },
  };

  // Intentar con diferentes modelos
  let lastError: Error | null = null;

  for (const modelName of MODELS_TO_TRY) {
    try {
      console.log(`Intentando con modelo: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      console.log(`Respuesta de ${modelName}:`, text.substring(0, 300));

      // Limpiar la respuesta para extraer solo el JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se pudo extraer JSON de la respuesta');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Extraer productos
      const products = parsed.products || parsed.items || [];
      const store = parsed.store || parsed.supermarket || 'Tienda';
      
      if (!Array.isArray(products) || products.length === 0) {
        throw new Error('No se encontraron productos');
      }

      const prices: ScannedPrice[] = products.map((p: any) => ({
        productName: p.name || p.product || p.nombre || 'Producto',
        price: typeof p.price === 'number' ? p.price : parseFloat(String(p.price || p.precio || 0).replace(',', '.')),
        store: store
      })).filter((p: ScannedPrice) => p.price > 0);

      console.log(`Éxito con ${modelName}: ${prices.length} productos`);
      
      return { prices };
    } catch (error: any) {
      console.error(`Error con ${modelName}:`, error.message);
      lastError = error;
      
      // Si es error 404/not found, probar siguiente modelo
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        continue;
      }
      
      // Si es error de cuota, probar siguiente modelo
      if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('exceeded')) {
        continue;
      }
      
      // Si es error de parsing, probar siguiente
      if (error.name === 'SyntaxError') {
        continue;
      }
    }
  }

  // Verificar tipo de error
  const errorMsg = lastError?.message || 'Error desconocido';
  
  if (errorMsg.includes('429') || errorMsg.includes('quota')) {
    return {
      prices: [],
      error: 'Límite de API alcanzado. Espera unos minutos o configura facturación en Google Cloud.'
    };
  }

  return {
    prices: [],
    error: `No se pudo procesar: ${errorMsg}`
  };
}
