import { GoogleGenAI, GoogleGenAIOptions } from '@google/genai';
import { getSettings } from '../settings/get-settings';
import { isDebug, logger } from '../utils/logger';
import { removedJsonPrefix } from '../utils/str';
import { safeJsonParse } from '../utils/parse';

export const createGeminiProvider = async (payload: {
  message: string;
}): Promise<string> => {
  const settings = await getSettings();

  const apiKey = settings.providers?.gemini?.apiKey;
  const endpoint = settings.providers?.gemini?.endpoint;

  if (!apiKey) {
    throw new Error(
      'Gemini API key is required. Please run "ai --init" to configure.'
    );
  }

  const config: GoogleGenAIOptions = { apiKey };
  if (endpoint) {
    config.httpOptions = {
      baseUrl: endpoint
    };
  }

  const ai = new GoogleGenAI(config);

  try {
    if (isDebug) {
      logger.info('Sending message to Gemini:', payload.message);
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: payload.message
    });

    const text = response.text;

    if (isDebug) {
      logger.info('Gemini response:', text);
    }

    const cleanedResponse = removedJsonPrefix(text || '');
    return safeJsonParse(cleanedResponse);
  } catch (error) {
    if (isDebug) {
      logger.error('Gemini API error:', error);
    }
    throw new Error(
      `Failed to get response from Gemini: ${(error as Error).message}`
    );
  }
};
