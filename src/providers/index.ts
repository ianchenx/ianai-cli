// 导入其他provider

import { createKimiChat } from './kimi';
import { createGeminiProvider } from './gemini';

export const providerType = {
  kimi: 'kimi',
  gemini: 'gemini'
} as const;

export const providerTypeList = Object.values(providerType);

export type ProviderType = (typeof providerType)[keyof typeof providerType];

export const createProvider = async (
  type: ProviderType,
  config: any
): Promise<string> => {
  switch (type) {
    case providerType.kimi:
      return await createKimiChat(config);

    case providerType.gemini:
      return await createGeminiProvider(config);

    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
};
