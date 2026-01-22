"use server";

import { GoogleGenerativeAI } from '@google/generative-ai';

// API key del servidor (no NEXT_PUBLIC_)
const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

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
 * Escanea una imagen de ticket usando Gemini AI (ejecutado en servidor)
 */
export async function scanImageOnServer(imageBase64: string): Promise<ScanResult> {
  if (!apiKey || apiKey.length < 10) {
    return {
      prices: [],
      error: 'Falta configurar GEMINI_API_KEY en Vercel → Settings → Environment Variables'
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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
      return { prices: [], error: 'No se encontraron productos con precios válidos.' };
    }

    return { prices };

  } catch (err: any) {
    const msg = err.message || String(err);
    console.error('Error Gemini:', msg);

    if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
      return { prices: [], error: 'API Key inválida. Genera una nueva en aistudio.google.com/apikey' };
    }
    
    if (msg.includes('429') || msg.includes('quota') || msg.includes('exceeded')) {
      return { prices: [], error: 'Límite de API alcanzado. Espera 1 minuto.' };
    }
    
    if (msg.includes('403')) {
      return { prices: [], error: 'Acceso denegado. Verifica que GEMINI_API_KEY esté configurada en Vercel (sin NEXT_PUBLIC_).' };
    }

    return { prices: [], error: `Error: ${msg.slice(0, 150)}` };
  }
}
