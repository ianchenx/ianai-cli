import { getSettings } from '../settings/get-settings';

import axios from 'axios';
import { removedJsonPrefix } from '../utils/str';
import { isDebug, logger } from '../utils/logger';
import { safeJsonParse } from '../utils/parse';

interface KimiChatPayload {
  name: string;
  is_example: boolean;
  enter_method: string;
  kimiplus_id: string;
  model: string;
}

interface KimiRequestMessage {
  messages: {
    role: string;
    content: string;
  }[];
  use_search: boolean;
  extend: {
    sidebar: boolean;
  };
  kimiplus_id: string;
  use_research: boolean;
  use_math: boolean;
  refs: any[];
  refs_file: any[];
  model: string;
}

export const createKimiChat = async (payload: {
  message: string;
}): Promise<string> => {
  const settings = await getSettings();

  const endpoint = settings.providers?.kimi?.endpoint;
  const apiKey = settings.providers?.kimi?.apiKey;

  if (!apiKey || !endpoint) {
    throw new Error(
      'Kimi API configuration is required. Please run "ai --init" to configure.'
    );
  }

  const chatConfig: KimiChatPayload = {
    name: 'new chat',
    is_example: false,
    enter_method: 'new_chat',
    kimiplus_id: 'kimi',
    model: 'k2'
  };

  const initializeChat = async (): Promise<string> => {
    const response = await axios.post(`${endpoint}/chat`, chatConfig, {
      headers: { authorization: apiKey }
    });
    return response.data.id;
  };

  const chatId = await initializeChat();

  const streamCompletion = async (): Promise<string> => {
    const messagePayload: KimiRequestMessage = {
      messages: [{ role: 'user', content: payload.message }],
      use_search: false,
      extend: { sidebar: false },
      kimiplus_id: 'kimi',
      use_research: false,
      use_math: false,
      refs: [],
      refs_file: [],
      model: 'k2'
    };

    const response = await axios.post(
      `${endpoint}/chat/${chatId}/completion/stream`,
      messagePayload,
      {
        responseType: 'stream',
        headers: { authorization: apiKey }
      }
    );

    return processStreamResponse(response);
  };

  const processStreamResponse = (response: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      let rawData = '';
      let processedContent = '';

      response.data.on('data', (chunk: Buffer) => {
        rawData += chunk;
      });

      response.data.on('end', () => {
        const eventMessages = parseStreamData(rawData);
        processedContent = extractContentFromEvents(eventMessages);
        resolve(processedContent);
      });

      response.data.on('error', reject);
    });
  };

  const parseStreamData = (rawData: string): string[] => {
    return rawData
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.replace('data: ', ''));
  };

  const extractContentFromEvents = (events: string[]): string => {
    let content = '';

    if (isDebug) {
      logger.info('\nKimi response:', events);
    }

    for (const event of events) {
      try {
        const parsedEvent = safeJsonParse(event);
        if (parsedEvent.event === 'cmpl' && parsedEvent.text) {
          content += parsedEvent.text;
        }
      } catch (err) {
        throw new Error('Failed to parse endpoint response as JSON');
      }
    }
    return content;
  };

  const response = await streamCompletion();
  return safeJsonParse(removedJsonPrefix(response));
};
