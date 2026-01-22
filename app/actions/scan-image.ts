"use server";

import { GoogleGenerativeAI } from '@google/generative-ai';

// API key del servidor (sin NEXT_PUBLIC_ para que no se exponga al cliente)
const apiKey = process.env.GEMINI_API_KEY || '';

export interface ScannedPrice {
  productName: string;
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
 * Escanea una imagen de ticket usando Gemini AI (ejecutado en servidor Vercel)
 */
export async function scanImageOnServer(imageBase64: string): Promise<ScanResult> {
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

  const prompt = `Analiza este ticket de compra. Responde SOLO con JSON:
{"store":"nombre","products":[{"name":"producto","price":1.23}]}
Sin markdown, sin explicaciones. Precios con punto decimal.`;

  // Preparar imagen
  const base64Data = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');
  const mimeType = imageBase64.match(/^data:(image\/[^;]+);/)?.[1] || 'image/jpeg';
  
  let lastError = '';

  for (const modelName of MODELS) {
    try {
      console.log(`Probando modelo: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });

      const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64Data, mimeType } }
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
