"use server";

import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';

export async function parseVoiceShoppingList(transcript: string) {
    if (!apiKey) return { error: 'API Key no configurada en el servidor (GEMINI_API_KEY).' };

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

    const prompt = `Analiza el siguiente texto dictado por un usuario para añadir productos a su lista de la compra.
Identifica cada producto mencionado y su cantidad.
Si no se especifica cantidad, asume 1.
Limpia los nombres para que sean genéricos y correctos (ej: "3 kilos de patatas" -> name: "Patatas", quantity: 3. "un bote de tomate frito" -> name: "Tomate frito", quantity: 1).

Texto dictado: "${transcript}"

Responde SOLO con un objeto JSON con este formato exacto y NADA más:
{"items": [{"name": "Nombre producto", "quantity": numero}]}
Sin markdown, sin explicaciones.`;

    try {
        const result = await model.generateContent([prompt]);
        const text = result.response.text();
        const cleanText = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return { items: parsed.items || [] };
        }
        return { items: [] };
    } catch (err: any) {
        return { error: err.message };
    }
}
