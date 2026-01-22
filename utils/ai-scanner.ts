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

// Modelos a probar (en orden de preferencia)
// Incluimos varias variantes por si alguna funciona
const MODELS_TO_TRY = [
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-pro-latest', 
  'gemini-1.5-pro',
  'models/gemini-1.5-flash',
  'models/gemini-1.5-pro',
];

/**
 * Escanea una imagen de ticket/producto usando Gemini AI
 */
export async function scanReceiptImage(imageBase64: string): Promise<ScanResult> {
  if (!genAI || !apiKey) {
    return {
      prices: [],
      error: 'API de Gemini no configurada. Añade NEXT_PUBLIC_GEMINI_API_KEY en las variables de entorno de Vercel.'
    };
  }

  const prompt = `Analiza esta imagen de ticket de compra y extrae los productos con sus precios.

Responde SOLO con JSON válido, sin markdown:
{"store":"nombre tienda","products":[{"name":"producto","price":1.23}]}

REGLAS:
- Solo JSON puro, sin \`\`\`, sin explicaciones
- Precios con punto decimal (1.50, no 1,50)
- Si no ves tienda, usa "Tienda"
- Extrae todos los productos visibles`;

  // Preparar imagen
  const base64Data = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');
  const mimeType = imageBase64.match(/^data:(image\/[^;]+);/)?.[1] || 'image/jpeg';
  
  const imagePart = {
    inlineData: { data: base64Data, mimeType }
  };

  const errors: string[] = [];

  for (const modelName of MODELS_TO_TRY) {
    try {
      console.log(`→ Probando: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const result = await model.generateContent([prompt, imagePart]);
      const text = result.response.text();
      
      console.log(`← Respuesta (${modelName}):`, text.slice(0, 300));

      // Limpiar y parsear JSON
      const cleanText = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        errors.push(`${modelName}: No JSON en respuesta`);
        continue;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const products = parsed.products || parsed.items || [];
      const store = parsed.store || 'Tienda';
      
      if (!Array.isArray(products) || products.length === 0) {
        errors.push(`${modelName}: Sin productos detectados`);
        continue;
      }

      const prices: ScannedPrice[] = products
        .map((p: any) => ({
          productName: String(p.name || p.producto || 'Producto').trim(),
          price: parseFloat(String(p.price || p.precio || 0).replace(',', '.')),
          store
        }))
        .filter((p: ScannedPrice) => p.price > 0);

      if (prices.length === 0) {
        errors.push(`${modelName}: Productos sin precios válidos`);
        continue;
      }

      console.log(`✓ Éxito con ${modelName}: ${prices.length} productos`);
      return { prices };
      
    } catch (err: any) {
      const msg = err.message || String(err);
      console.error(`✗ ${modelName}:`, msg.slice(0, 200));
      errors.push(`${modelName}: ${msg.slice(0, 100)}`);
      
      // Si es error de API key inválida, no seguir probando
      if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
        return {
          prices: [],
          error: 'API Key inválida. Ve a Google AI Studio (aistudio.google.com) y genera una nueva API key.'
        };
      }
    }
  }

  // Analizar errores para dar mensaje útil
  const allErrors = errors.join(' | ');
  
  if (allErrors.includes('429') || allErrors.includes('quota') || allErrors.includes('RATE_LIMIT')) {
    return {
      prices: [],
      error: 'Límite de API alcanzado. Espera unos minutos o crea una nueva API key en aistudio.google.com'
    };
  }
  
  if (allErrors.includes('404') || allErrors.includes('not found')) {
    return {
      prices: [],
      error: `Modelos no disponibles. Verifica tu API key en aistudio.google.com. Debug: ${errors[0]}`
    };
  }

  if (allErrors.includes('JSON') || allErrors.includes('Sin productos')) {
    return {
      prices: [],
      error: 'No se pudieron detectar productos. Intenta con una foto más clara y con buena iluminación.'
    };
  }

  return {
    prices: [],
    error: `Error: ${errors[0] || 'Desconocido'}`
  };
}
