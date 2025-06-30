import fs from 'fs';
import readline from 'readline';

import { askQuestion } from '../ask-question';
import { settingsDir, settingsFilePath } from '../constants/settings-constants';
import { logger } from '../utils/logger';
import { saveSettings } from './save-settings';
import { getDefaults, Settings, settingsSchema } from './settings-schema';
import { select } from '@clack/prompts';
import { providerType, ProviderType, providerTypeList } from '../providers';

export async function initSettings(rl: readline.Interface) {
  fs.mkdirSync(settingsDir, { recursive: true });
  let settings: Settings = {
    endpoint: '',
    payload: {},
    headers: {},
    metadata: {},
    commitment: { type: '' },
    provider: providerType.kimi
  };
  const defaultValues = getDefaults(settingsSchema);

  const provider = (await askQuestion(
    rl,
    'Select one Model:',
    providerTypeList
  )) as ProviderType;

  let endpoint = '';
  let authTokenPrompt = '';

  if (provider === providerType.gemini) {
    endpoint = '';
    authTokenPrompt = 'Enter your Gemini API key: ';
  } else {
    endpoint =
      (await askQuestion(rl, 'Enter the API endpoint(default kimi): ')) ||
      defaultValues.endpoint;
    authTokenPrompt = 'Enter your auth token: ';
  }

  const authorization = await askQuestion(rl, authTokenPrompt);

  const headers = await askForCustomObject(rl, 'headers');

  settings.provider = provider;
  settings.endpoint = endpoint;
  settings.commitment = defaultValues.commitment;

  settings.headers = { ...headers, authorization };

  logger.info(
    `Saving settings at ${settingsFilePath}:\n${JSON.stringify(
      settings,
      null,
      2
    )}}`
  );

  saveSettings(settings);
  rl.close();
  process.exit(0);
}

export async function askForCustomObject(
  rl: readline.Interface,
  objectName: string
) {
  const obj = {};
  let addingObj = true;

  while (addingObj) {
    const key = await askQuestion(
      rl,
      `Enter ${objectName} key (or type 'done' to finish): `
    );

    if (key.toLowerCase() === 'done') {
      addingObj = false;
    } else {
      const value = await askQuestion(
        rl,
        `Enter value for ${objectName} '${key}': `
      );
      obj[key] = value;
    }
  }

  return obj;
}
