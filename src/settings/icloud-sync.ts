import fs from 'fs';
import os from 'os';
import path from 'path';
import { logger } from '../utils/logger';
import { askQuestion } from '../ask-question';

// Path configuration
const getICloudPaths = () => {
  const homeDir = os.homedir();
  return {
    homeDir,
    iCloudDir: path.join(
      homeDir,
      'Library/Mobile Documents/com~apple~CloudDocs'
    ),
    defaultDir: path.join(homeDir, '.ianai'),
    iCloudSettingsDir: path.join(
      homeDir,
      'Library/Mobile Documents/com~apple~CloudDocs/ianai'
    )
  };
};

/**
 * Check if iCloud sync is supported
 */
export const isICloudSupported = (): boolean => {
  const { iCloudDir } = getICloudPaths();
  return os.platform() === 'darwin' && fs.existsSync(iCloudDir);
};

/**
 * Check if iCloud sync is enabled
 */
export const isICloudEnabled = (): boolean => {
  const { iCloudSettingsDir } = getICloudPaths();
  return fs.existsSync(path.join(iCloudSettingsDir, 'settings.json'));
};

/**
 * Check if local settings exist
 */
export const hasLocalSettings = (): boolean => {
  const { defaultDir } = getICloudPaths();
  return fs.existsSync(path.join(defaultDir, 'settings.json'));
};

/**
 * Get the currently active settings directory
 */
export const getActiveSettingsDir = (): string => {
  const { iCloudSettingsDir, defaultDir } = getICloudPaths();

  if (isICloudSupported() && isICloudEnabled()) {
    return iCloudSettingsDir;
  }

  return defaultDir; // Always return default directory as fallback
};

/**
 * Get settings file path
 */
export const getSettingsFilePath = (directory?: string): string => {
  const targetDir = directory || getActiveSettingsDir();
  return path.join(targetDir, 'settings.json');
};

/**
 * Get sync status information
 */
export const getICloudStatus = () => {
  const paths = getICloudPaths();
  return {
    supported: isICloudSupported(),
    enabled: isICloudEnabled(),
    hasLocal: hasLocalSettings(),
    iCloudPath: paths.iCloudSettingsDir,
    localPath: paths.defaultDir,
    activePath: getActiveSettingsDir()
  };
};

/**
 * Migrate local settings to iCloud
 */
const migrateLocalToICloud = async (rl: any): Promise<void> => {
  const { defaultDir, iCloudSettingsDir } = getICloudPaths();
  const localSettingsPath = path.join(defaultDir, 'settings.json');
  const iCloudSettingsPath = path.join(iCloudSettingsDir, 'settings.json');

  // Copy settings file
  const settingsContent = fs.readFileSync(localSettingsPath, 'utf8');
  fs.writeFileSync(iCloudSettingsPath, settingsContent);

  // Ask if user wants to delete local file
  const removeLocal = await askQuestion(
    rl,
    'Do you want to delete the local config file to avoid conflicts? (y/N): '
  );

  if (
    removeLocal.toLowerCase() === 'y' ||
    removeLocal.toLowerCase() === 'yes'
  ) {
    fs.unlinkSync(localSettingsPath);
    try {
      fs.rmdirSync(defaultDir);
    } catch {
      // Directory not empty, keep it
    }
  }
};

/**
 * Migrate iCloud settings to local
 */
const migrateICloudToLocal = async (): Promise<void> => {
  const { defaultDir, iCloudSettingsDir } = getICloudPaths();
  const localSettingsPath = path.join(defaultDir, 'settings.json');
  const iCloudSettingsPath = path.join(iCloudSettingsDir, 'settings.json');

  // Ensure local directory exists
  fs.mkdirSync(defaultDir, { recursive: true });

  // Copy settings file
  const settingsContent = fs.readFileSync(iCloudSettingsPath, 'utf8');
  fs.writeFileSync(localSettingsPath, settingsContent);

  // Delete iCloud settings
  fs.unlinkSync(iCloudSettingsPath);
  try {
    fs.rmdirSync(iCloudSettingsDir);
  } catch {
    // Directory not empty, keep it
  }
};

/**
 * Enable iCloud sync
 */
export const enableICloudSync = async (rl: any): Promise<boolean> => {
  if (!isICloudSupported()) {
    logger.error(
      'iCloud sync is only available on macOS with iCloud Drive enabled.'
    );
    return false;
  }

  if (isICloudEnabled()) {
    logger.info('iCloud sync is already enabled.');
    return true;
  }

  try {
    const { iCloudSettingsDir } = getICloudPaths();

    // Create iCloud directory
    fs.mkdirSync(iCloudSettingsDir, { recursive: true });

    // Migrate existing local settings if any
    if (hasLocalSettings()) {
      await migrateLocalToICloud(rl);
    }

    logger.success('✅ Successfully enabled iCloud sync!');
    return true;
  } catch (error) {
    logger.error('Failed to enable iCloud sync:', error);
    return false;
  }
};

/**
 * Disable iCloud sync
 */
export const disableICloudSync = async (rl: any): Promise<boolean> => {
  if (!isICloudEnabled()) {
    logger.info('iCloud sync is not enabled.');
    return true;
  }

  const confirmDisable = await askQuestion(
    rl,
    'Are you sure you want to disable iCloud sync? This will move settings back to local directory. (y/N): '
  );

  if (
    confirmDisable.toLowerCase() !== 'y' &&
    confirmDisable.toLowerCase() !== 'yes'
  ) {
    return false;
  }

  try {
    await migrateICloudToLocal();
    logger.success(
      '✅ Successfully disabled iCloud sync and migrated settings to local!'
    );
    return true;
  } catch (error) {
    logger.error('Failed to disable iCloud sync:', error);
    return false;
  }
};

/**
 * Ask user if they want to enable iCloud sync (for initialization process)
 */
export const askToEnableICloudSync = async (rl: any): Promise<string> => {
  const { defaultDir, iCloudSettingsDir } = getICloudPaths();

  if (!isICloudSupported()) {
    return defaultDir;
  }

  // If already enabled, return iCloud directory directly
  if (isICloudEnabled()) {
    return iCloudSettingsDir;
  }

  const hasLocal = hasLocalSettings();

  let message: string;
  if (hasLocal) {
    logger.info('Detected existing configuration file in local directory.');
    message =
      'Do you want to enable iCloud sync? This will sync your settings across all devices. (y/N): ';
  } else {
    message =
      'Do you want to enable iCloud sync? This will sync your settings across all devices. (y/N): ';
  }

  const enableSync = await askQuestion(rl, message);

  if (enableSync.toLowerCase() === 'y' || enableSync.toLowerCase() === 'yes') {
    fs.mkdirSync(iCloudSettingsDir, { recursive: true });

    if (hasLocal) {
      await migrateLocalToICloud(rl);
    } else {
      logger.info('✅ Will use iCloud sync to save settings.');
    }

    return iCloudSettingsDir;
  }

  return defaultDir;
};
