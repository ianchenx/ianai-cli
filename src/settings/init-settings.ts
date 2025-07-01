import fs from 'fs';
import readline from 'readline';
import path from 'path';

import { askQuestion } from '../ask-question';
import { logger } from '../utils/logger';
import { saveSettings } from './save-settings';
import { getDefaults, Settings, settingsSchema } from './settings-schema';
import { select } from '@clack/prompts';
import { providerType, ProviderType, providerTypeList } from '../providers';
import { configureProvider } from '../commands/config';
import { askToEnableICloudSync } from './icloud-sync';

export async function initSettings(rl: readline.Interface) {
  // Use iCloud sync module to ask user if they want to enable iCloud sync
  const chosenSettingsDir = await askToEnableICloudSync(rl);

  // Ensure directory exists
  fs.mkdirSync(chosenSettingsDir, { recursive: true });

  let settings: Settings = {
    payload: {},
    metadata: {},
    commitment: { type: '' },
    provider: providerType.kimi,
    providers: {}
  };
  const defaultValues = getDefaults(settingsSchema);

  const provider = (await askQuestion(
    rl,
    'Select one Model:',
    providerTypeList
  )) as ProviderType;

  const providerConfig = await configureProvider(provider, rl);
  settings.providers = {
    ...settings.providers,
    ...providerConfig
  };

  const additionalHeaders = await askForCustomObject(rl, 'additional headers');

  settings.provider = provider;
  settings.commitment = defaultValues.commitment;

  // Save settings to the selected directory
  const finalSettingsPath = path.join(chosenSettingsDir, 'settings.json');
  logger.info(
    `Saving settings at ${finalSettingsPath}:\n${JSON.stringify(
      settings,
      null,
      2
    )}}`
  );

  // Write directly to the selected directory
  fs.writeFileSync(finalSettingsPath, JSON.stringify(settings, null, 2));

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
