"use server";

import { GoogleGenerativeAI } from '@google/generative-ai';

// API key del servidor (sin NEXT_PUBLIC_ para que no se exponga al cliente)
const apiKey = process.env.GEMINI_API_KEY || '';

export interface ScannedPrice {
  productName: string;
  canonicalName?: string;
  price: number;
  store?: string;
}

export interface ScanResult {
  prices: ScannedPrice[];
  error?: string;
}

// Modelos a probar en orden
const MODELS = [
  'gemini-2.0-flash-lite',  // Menos restricciones
  'gemini-2.0-flash',
  'gemini-2.5-flash',
];

/**
 * Escanea una o más imágenes de ticket usando Gemini AI (ejecutado en servidor Vercel)
 * Soporta recibir un array de imágenes base64 para tickets muy largos fotografiados por partes.
 */
export async function scanImageOnServer(imagesBase64: string | string[]): Promise<ScanResult> {
  // Log para debug
  console.log('=== SCAN IMAGE SERVER ===');
  console.log('API Key configurada:', apiKey ? `Sí (${apiKey.slice(0, 10)}...)` : 'NO');

  if (!apiKey) {
    return {
      prices: [],
      error: 'GEMINI_API_KEY no está configurada en Vercel. Ve a Settings → Environment Variables y añádela (sin NEXT_PUBLIC_). Luego haz Redeploy.'
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const prompt = `Analiza este ticket de compra (puede estar compuesto por varias imágenes para garantizar legibilidad). 
Extrae el nombre del supermercado/tienda y todos los productos con sus precios finales.

IMPORTANTE SOBRE EL IDIOMA Y LA LECTURA:
- Los tickets pueden estar en Español, Catalán o Inglés.
- Si la imagen es un poco borrosa o está tomada desde lejos, intenta deducir el texto basándote en el contexto típico de un supermercado (ej: si a medias lees "Llet Sem" probablemente sea "Llet Semidesnatada").
- Evita incluir subtotales, totales, cambios, o tarjetas de fidelidad como si fueran productos. Solo artículos comprados.

Para cada producto, deduce también su "artículo madre" o categoría genérica básica EN ESPAÑOL. Por ejemplo:
- "Asturiana 1L", "Llet Semidesnatada", o "Skimmed Milk" -> canonicalName: "Leche"
- "Gallo Fideos 500g" -> canonicalName: "Fideos"
- "Pernil Salat" -> canonicalName: "Jamón"

MUY IMPORTANTE - VERIFICACIÓN MATEMÁTICA:
Antes de devolver el resultado, verifica internamente que la suma de los precios de los artículos individuales coincida aproximadamente con el precio TOTAL del ticket. 
Si la suma no cuadra, es probable que hayas leído un precio mal. Si es así, vuelve a revisar tus lecturas de precios fila por fila hasta 3 veces antes de entregar la respuesta final.

Responde SOLO con un objeto JSON con este formato exacto y NADA más:
{"store":"Nombre del supermercado","products":[{"name":"texto original del ticket","canonicalName":"Articulo Madre Generico","price":1.23}]}

Reglas:
- "store": nombre del supermercado o tienda. Si no lo ves seguro, usa "Desconocido".
- "canonicalName": nombre genérico y limpio del producto SIEMPRE EN ESPAÑOL (Leche, Huevos, Pan, Tomate Frito, Queso, etc.).
- Precios con punto decimal. Usa el importe total de esa línea de producto (no el precio por kilo, a menos que sea lo único que haya).
- Sin markdown, sin explicaciones. Las claves del JSON deben ir entre comillas dobles.`;

  // Preparar imágenes
  const imageArray = Array.isArray(imagesBase64) ? imagesBase64 : [imagesBase64];
  const imageParts = imageArray.map(img => {
    return {
      inlineData: {
        data: img.replace(/^data:image\/[^;]+;base64,/, ''),
        mimeType: img.match(/^data:(image\/[^;]+);/)?.[1] || 'image/jpeg'
      }
    };
  });

  let lastError = '';

  for (const modelName of MODELS) {
    try {
      console.log(`Probando modelo: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });

      const result = await model.generateContent([
        prompt,
        ...imageParts
      ]);

      const text = result.response.text();
      console.log(`Respuesta de ${modelName}:`, text.slice(0, 200));

      // Parsear JSON
      const cleanText = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        console.log('No se encontró JSON en la respuesta');
        continue;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const products = parsed.products || [];
      const store = parsed.store || 'Tienda';

      const prices: ScannedPrice[] = products
        .map((p: any) => ({
          productName: String(p.name || 'Producto').trim(),
          canonicalName: String(p.canonicalName || p.name || 'Producto').trim(),
          price: parseFloat(String(p.price || 0).replace(',', '.')),
          store
        }))
        .filter((p: ScannedPrice) => p.price > 0);

      if (prices.length === 0) {
        continue;
      }

      console.log(`✓ Éxito con ${modelName}: ${prices.length} productos`);
      return { prices };

    } catch (err: any) {
      const msg = err.message || String(err);
      console.error(`✗ Error con ${modelName}:`, msg.slice(0, 200));
      lastError = msg;

      // Si es error de API key, no seguir probando
      if (msg.includes('API_KEY_INVALID')) {
        return { prices: [], error: 'API Key inválida. Genera una nueva en aistudio.google.com/apikey' };
      }

      // Seguir probando con el siguiente modelo
      continue;
    }
  }

  // Analizar el último error
  if (lastError.includes('429') || lastError.includes('quota')) {
    return { prices: [], error: 'Límite de API alcanzado. Espera 1 minuto.' };
  }

  if (lastError.includes('403')) {
    return {
      prices: [],
      error: 'Error 403: La API key no tiene permisos. Crea una nueva API key en aistudio.google.com/apikey y configúrala en Vercel como GEMINI_API_KEY'
    };
  }

  return {
    prices: [],
    error: lastError ? `Error: ${lastError.slice(0, 100)}` : 'No se pudieron detectar productos. Intenta con mejor iluminación.'
  };
}
