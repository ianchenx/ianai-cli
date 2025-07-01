import fs from 'fs';
import path from 'path';

import {
  settingsFilePath,
  getSettingsFilePathCompat
} from '../constants/settings-constants';
import { logger } from '../utils/logger';
import { Settings } from './settings-schema';

export function saveSettings(settings: Settings, directory?: string) {
  try {
    const filePath = directory
      ? getSettingsFilePathCompat(directory)
      : settingsFilePath;

    // Ensure directory exists
    if (directory) {
      fs.mkdirSync(directory, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
  } catch (err: any) {
    logger.error(`Error saving settings file: ${err.message}`);
  }
}
