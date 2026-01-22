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

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

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

  try {
    let imagePart;

    if (typeof imageBase64 === 'string') {
      // Si es base64, convertir a formato que Gemini entienda
      const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
      const mimeType = imageBase64.match(/^data:image\/(png|jpeg|jpg);base64,/)?.[1] || 'jpeg';
      
      imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: `image/${mimeType}`,
        },
      };
    } else {
      // Si es File o Blob, convertir a base64
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

    return parsed;
  } catch (error) {
    console.error('Error al escanear imagen:', error);
    throw new Error(
      `Error al procesar la imagen: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}
