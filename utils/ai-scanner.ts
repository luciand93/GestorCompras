import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

export interface ScannedPrice {
  productName: string;
  price: number;
  store?: string;
}

export interface ScanResult {
  prices: ScannedPrice[];
  error?: string;
}

export function isGeminiConfigured(): boolean {
  return apiKey.length > 10;
}

/**
 * Escanea una imagen de ticket usando Gemini AI
 */
export async function scanReceiptImage(imageBase64: string): Promise<ScanResult> {
  // Verificar API key
  if (!apiKey || apiKey.length < 10) {
    return {
      prices: [],
      error: 'Falta configurar NEXT_PUBLIC_GEMINI_API_KEY en Vercel → Settings → Environment Variables'
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Usar gemini-1.5-flash que es el modelo estándar actual
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Analiza este ticket de compra. Responde SOLO con JSON:
{"store":"nombre","products":[{"name":"producto","price":1.23}]}
Sin markdown, sin explicaciones. Precios con punto decimal.`;

    // Preparar imagen
    const base64Data = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');
    const mimeType = imageBase64.match(/^data:(image\/[^;]+);/)?.[1] || 'image/jpeg';

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType } }
    ]);

    const text = result.response.text();
    console.log('Respuesta Gemini:', text);

    // Parsear JSON
    const cleanText = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return { prices: [], error: 'No se detectaron productos. Intenta con mejor iluminación.' };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const products = parsed.products || [];
    const store = parsed.store || 'Tienda';

    const prices: ScannedPrice[] = products
      .map((p: any) => ({
        productName: String(p.name || 'Producto').trim(),
        price: parseFloat(String(p.price || 0).replace(',', '.')),
        store
      }))
      .filter((p: ScannedPrice) => p.price > 0);

    if (prices.length === 0) {
      return { prices: [], error: 'No se encontraron productos con precios. Asegúrate de que el ticket sea legible.' };
    }

    return { prices };

  } catch (err: any) {
    const msg = err.message || String(err);
    console.error('Error Gemini:', msg);

    // Errores específicos
    if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
      return { prices: [], error: 'API Key inválida. Genera una nueva en aistudio.google.com/apikey' };
    }
    
    if (msg.includes('429') || msg.includes('quota') || msg.includes('RATE_LIMIT') || msg.includes('exceeded')) {
      return { prices: [], error: 'Límite de API alcanzado. Espera 1 minuto y vuelve a intentar.' };
    }
    
    if (msg.includes('404') || msg.includes('not found')) {
      return { prices: [], error: 'Modelo no disponible. Tu API key puede tener restricciones. Crea una nueva en aistudio.google.com/apikey' };
    }

    if (msg.includes('PERMISSION_DENIED')) {
      return { prices: [], error: 'Permiso denegado. Activa la API de Gemini en tu proyecto de Google Cloud.' };
    }

    // Error genérico con detalle
    return { prices: [], error: `Error: ${msg.slice(0, 150)}` };
  }
}
