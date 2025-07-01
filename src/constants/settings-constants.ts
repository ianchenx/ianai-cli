import fs from 'fs';
import path from 'path';

import { schemaDirname } from '../message-response-schema';
import {
  getActiveSettingsDir,
  getSettingsFilePath,
  getICloudStatus
} from '../settings/icloud-sync';

const cpuArchitecture = process.arch;
const osPlatform = process.platform;
const osType = process.platform;
const kernelVersion = process.version;

// Use iCloud sync module to get settings directory
export const settingsDir = getActiveSettingsDir();
export const settingsFileName = `settings.json`;
export const settingsFilePath = `${settingsDir}/${settingsFileName}`;

// Compatibility function: get settings file path based on specified directory
export function getSettingsFilePathCompat(directory?: string): string {
  return getSettingsFilePath(directory);
}

// Compatibility function: get all possible settings directories
export function getAvailableSettingsDirs(): { local: string; icloud?: string } {
  const status = getICloudStatus();
  const result: { local: string; icloud?: string } = {
    local: status.localPath
  };

  if (status.supported) {
    result.icloud = status.iCloudPath;
  }

  return result;
}

const schemaString = fs.readFileSync(
  path.join(schemaDirname, 'command-response-schema.ts'),
  'utf8'
);

export const systemPrompt = `You are a command line translation program. You can translate natural language instructions from human language into corresponding command line statements.

1. If you don't understand what I'm talking about, or aren't sure how to translate my instructions into the computer command line, simply output the 7 letters "UNKNOWN" into the command field without any other explanation 

3. If the translated result consists of more than one line of commands, please use '&' or '&&' to combine them into a single line of command.

Respond only in JSON that satisfies the Response type:
${schemaString.replace(/^(import|export) .*;$/gm, '').trim()}

User System Info:\n${JSON.stringify(
  { cpuArchitecture, osPlatform, osType, kernelVersion },
  null,
  2
)}\n`;
