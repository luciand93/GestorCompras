import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

// Crear cliente solo si hay API key
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export interface ScannedItem {
  name: string;
  price: number;
  unit_price?: number;
  supermarket: string;
  quantity?: number;
}

export interface ScanResult {
  items: ScannedItem[];
  date: string;
  supermarket: string;
}

/**
 * Verifica si la API de Gemini está configurada
 */
export function isGeminiConfigured(): boolean {
  return !!apiKey && !!genAI;
}

// Lista de modelos a probar en orden de preferencia
const MODELS_TO_TRY = [
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest', 
  'gemini-1.5-flash',
  'gemini-1.5-pro-latest',
  'gemini-pro-vision',
];

/**
 * Escanea una imagen de ticket/producto usando Gemini AI
 * @param imageBase64 - Imagen en base64 o File/Blob
 * @returns Resultado estructurado con items y precios
 */
export async function scanReceiptImage(
  imageBase64: string | File | Blob
): Promise<ScanResult> {
  // Verificar si Gemini está configurado
  if (!genAI) {
    throw new Error(
      'La API de Gemini no está configurada. Añade NEXT_PUBLIC_GEMINI_API_KEY en .env.local'
    );
  }

  const prompt = `Eres un asistente experto en extraer información de tickets de compra y productos.

Analiza la imagen proporcionada y extrae la siguiente información en formato JSON estricto:

{
  "supermarket": "nombre del supermercado",
  "date": "YYYY-MM-DD",
  "items": [
    {
      "name": "nombre del producto",
      "price": precio_total_del_item,
      "unit_price": precio_por_kg_o_litro_si_disponible,
      "quantity": cantidad_si_disponible
    }
  ]
}

REGLAS IMPORTANTES:
- Devuelve SOLO el JSON, sin texto adicional, sin markdown, sin código.
- Si no puedes identificar el supermercado, usa "Desconocido".
- Si no hay fecha visible, usa la fecha de hoy en formato YYYY-MM-DD.
- El precio debe ser un número decimal (ej: 3.50, no "3,50€").
- Si hay precio unitario (por kg/l), inclúyelo en unit_price.
- Si no hay precio unitario, omite el campo unit_price.
- Extrae todos los items visibles en el ticket.

IMPORTANTE: Responde ÚNICAMENTE con el JSON, sin explicaciones.`;

  // Preparar la imagen
  let imagePart;

  if (typeof imageBase64 === 'string') {
    const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
    const mimeMatch = imageBase64.match(/^data:image\/(png|jpeg|jpg|webp);base64,/);
    const mimeType = mimeMatch ? `image/${mimeMatch[1]}` : 'image/jpeg';
    
    imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };
  } else {
    const arrayBuffer = await imageBase64.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    const mimeType = imageBase64.type || 'image/jpeg';
    
    imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };
  }

  // Intentar con diferentes modelos
  let lastError: Error | null = null;

  for (const modelName of MODELS_TO_TRY) {
    try {
      console.log(`Intentando con modelo: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      // Limpiar la respuesta para extraer solo el JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se pudo extraer JSON de la respuesta de Gemini');
      }

      const parsed = JSON.parse(jsonMatch[0]) as ScanResult;

      // Validar estructura
      if (!parsed.items || !Array.isArray(parsed.items)) {
        throw new Error('La respuesta no tiene el formato esperado');
      }

      console.log(`Éxito con modelo: ${modelName}`);
      return parsed;
    } catch (error: any) {
      console.error(`Error con modelo ${modelName}:`, error.message);
      lastError = error;
      
      // Si es un error 404 (modelo no encontrado), probar el siguiente
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        continue;
      }
      
      // Si es otro tipo de error, lanzarlo
      throw error;
    }
  }

  // Si ningún modelo funcionó
  throw new Error(
    `No se pudo procesar la imagen. Ningún modelo de Gemini está disponible. ` +
    `Último error: ${lastError?.message || 'Error desconocido'}. ` +
    `Por favor, verifica tu API key en https://aistudio.google.com`
  );
}
