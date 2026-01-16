
import { GoogleGenAI, Type } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async analyzeMarket(asset: string, recentPrices: number[]): Promise<any> {
    const prompt = `Analyze the current trading situation for ${asset}. 
    Recent price trend: ${recentPrices.join(', ')}.
    Act as a professional algorithmic trader. Evaluate the momentum, volatility, and potential risk.
    Return a structured JSON analysis.`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sentiment: { type: Type.STRING, description: "BULLISH, BEARISH, or NEUTRAL" },
              score: { type: Type.NUMBER, description: "Strength from -1 to 1" },
              summary: { type: Type.STRING },
              recommendation: { type: Type.STRING },
              suggestedStopLoss: { type: Type.NUMBER },
              suggestedTakeProfit: { type: Type.NUMBER }
            },
            required: ["sentiment", "score", "summary", "recommendation"]
          }
        }
      });

      return JSON.parse(response.text || '{}');
    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      return {
        sentiment: 'NEUTRAL',
        score: 0,
        summary: 'Error connecting to analysis engine.',
        recommendation: 'HOLD'
      };
    }
  }

  async generateStrategyAdvice(mode: string, objective: string): Promise<string> {
    const prompt = `Generate a high-level automated trading strategy summary for ${mode} risk profile with the objective: "${objective}". Keep it concise and professional. Use bullet points for key rules.`;
    
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt
      });
      return response.text || "Unable to generate strategy.";
    } catch (error) {
      return "Strategic engine offline. Please check connectivity.";
    }
  }
}

export const geminiService = new GeminiService();
