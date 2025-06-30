import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSettings } from '../settings/get-settings';
import { isDebug, logger } from '../utils/logger';
import { removedJsonPrefix } from '../utils/str';
import { safeJsonParse } from '../utils/parse';

export const createGeminiProvider = async (payload: {
  message: string;
}): Promise<string> => {
  const settings = await getSettings();

  // 从 headers.authorization 中获取 API Key
  const apiKey = settings.headers?.authorization;
  if (!apiKey) {
    throw new Error('Gemini API key is required in authorization header');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  try {
    if (isDebug) {
      logger.info('Sending message to Gemini:', payload.message);
    }

    const result = await model.generateContent(payload.message);
    const response = await result.response;
    const text = response.text();

    if (isDebug) {
      logger.info('Gemini response:', text);
    }

    const cleanedResponse = removedJsonPrefix(text);
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
