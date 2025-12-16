import { GoogleGenAI } from "@google/genai";
import { Booking, Settings } from "../types";

const getAiClient = () => {
    // Safety check for environment variable
    if (!process.env.API_KEY) {
        console.warn("API_KEY is missing. Gemini features will be disabled.");
        return null;
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateConfirmationMessage = async (booking: Booking, settings: Settings): Promise<string> => {
    const ai = getAiClient();
    if (!ai) return `Reserva confirmada! Tolerância de ${settings.toleranceMinutes} min.`;

    try {
        const prompt = `
            Você é o anfitrião virtual elegante do restaurante "${settings.restaurantName}".
            Escreva uma mensagem curta, calorosa e em Português de Portugal para o cliente ${booking.customerName}.
            Confirme a reserva para o dia ${booking.date} às ${booking.time} para ${booking.partySize} pessoas.
            IMPORTANTÍSSIMO: Lembre-os que a tolerância é estritamente de ${settings.toleranceMinutes} minutos.
            Não use markdown, apenas texto simples. Máximo 2 frases.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text || "Reserva confirmada com sucesso!";
    } catch (error) {
        console.error("Gemini Error:", error);
        return `Reserva confirmada! Tolerância de ${settings.toleranceMinutes} min.`;
    }
};