import { getSettings } from '../settings/get-settings';
import { saveSettings } from '../settings/save-settings';
import { logger } from '../utils/logger';
import { providerType, ProviderType, providerTypeList } from '../providers';
import { askQuestion } from '../ask-question';
import { appContext } from '../app-context';
import {
  getICloudStatus,
  enableICloudSync,
  disableICloudSync
} from '../settings/icloud-sync';

export async function configureProvider(provider: ProviderType, rl: any) {
  const config: any = {};

  if (provider === providerType.gemini) {
    const geminiEndpoint = await askQuestion(
      rl,
      'Enter the Gemini API endpoint (optional, press Enter for default): '
    );
    const geminiApiKey = await askQuestion(rl, 'Enter your Gemini API key: ');
    config.gemini = {
      apiKey: geminiApiKey,
      ...(geminiEndpoint && { endpoint: geminiEndpoint })
    };
  } else if (provider === providerType.kimi) {
    const kimiEndpoint =
      (await askQuestion(rl, 'Enter the API endpoint(default kimi): ')) ||
      'https://kimi.moonshot.cn/api';
    const kimiApiKey = await askQuestion(rl, 'Enter your Kimi auth token: ');
    config.kimi = { endpoint: kimiEndpoint, apiKey: kimiApiKey };
  }

  return config;
}

// iCloud sync management function
async function manageiCloudSync(action: string, rl: any) {
  const status = getICloudStatus();

  switch (action) {
    case 'status':
      logger.info('🔄 iCloud Sync Status:');

      if (!status.supported) {
        logger.info(
          '  ❌ Current system does not support iCloud sync (macOS only)'
        );
        return;
      }

      if (status.enabled) {
        logger.info('  ✅ iCloud sync is enabled');
        logger.info(
          `  📁 Config file location: ${status.iCloudPath}/settings.json`
        );
      } else {
        logger.info('  ❌ iCloud sync is not enabled');
      }

      if (status.hasLocal) {
        logger.info(
          `  📁 Local config file: ${status.localPath}/settings.json`
        );
      }

      logger.info(`  📂 Current active directory: ${status.activePath}`);
      break;

    case 'enable':
      await enableICloudSync(rl);
      break;

    case 'disable':
      await disableICloudSync(rl);
      break;

    default:
      logger.info('Available iCloud sync commands:');
      logger.info('  ai config sync status  - Check sync status');
      logger.info('  ai config sync enable  - Enable iCloud sync');
      logger.info('  ai config sync disable - Disable iCloud sync');
  }
}

const configCommand = async (
  subcommand: string,
  key?: string,
  value?: string
) => {
  const settings = await getSettings();

  if (subcommand === 'sync') {
    // iCloud sync management
    const rl = appContext.rl;
    if (!rl) {
      logger.error('Failed to initialize readline interface');
      process.exit(1);
    }

    await manageiCloudSync(key || '', rl);
    return;
  }

  if (subcommand === 'add') {
    // Add new provider configuration
    const rl = appContext.rl;

    if (!rl) {
      logger.error('Failed to initialize readline interface');
      process.exit(1);
    }

    const provider = (await askQuestion(
      rl,
      'Select a provider to add:',
      providerTypeList
    )) as ProviderType;

    // Check if provider is already configured
    const isAlreadyConfigured =
      (provider === 'gemini' && settings.providers?.gemini?.apiKey) ||
      (provider === 'kimi' && settings.providers?.kimi?.apiKey);

    if (isAlreadyConfigured) {
      const overwrite = await askQuestion(
        rl,
        `${provider} is already configured. Do you want to overwrite it? (y/N): `
      );

      if (
        overwrite.toLowerCase() !== 'y' &&
        overwrite.toLowerCase() !== 'yes'
      ) {
        logger.info('Operation cancelled.');
        process.exit(0);
      }
    }

    try {
      const providerConfig = await configureProvider(provider, rl);

      // Merge configuration
      settings.providers = {
        ...settings.providers,
        ...providerConfig
      };

      saveSettings(settings);
      logger.success(`✅ Successfully added ${provider} configuration`);

      // Ask if user wants to switch to new provider
      if (settings.provider !== provider) {
        const switchNow = await askQuestion(
          rl,
          `Do you want to switch to ${provider} now? (y/N): `
        );

        if (
          switchNow.toLowerCase() === 'y' ||
          switchNow.toLowerCase() === 'yes'
        ) {
          settings.provider = provider;
          saveSettings(settings);
          logger.success(`✅ Switched to ${provider}`);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Failed to configure ${provider}: ${errorMessage}`);
      process.exit(1);
    }
  } else if (subcommand === 'switch') {
    const provider = key as ProviderType;
    if (!provider || !Object.values(providerType).includes(provider)) {
      logger.error('Please specify a valid provider: kimi, gemini');
      logger.info('Usage: ai config switch <provider>');
      process.exit(1);
    }

    if (provider === 'gemini' && !settings.providers?.gemini?.apiKey) {
      logger.error('Gemini not configured. Please run "ai config add" first.');
      process.exit(1);
    }
    if (provider === 'kimi' && !settings.providers?.kimi?.apiKey) {
      logger.error('Kimi not configured. Please run "ai config add" first.');
      process.exit(1);
    }

    settings.provider = provider;
    saveSettings(settings);
    logger.success(`✅ Switched to ${provider}`);
  } else if (subcommand === 'show') {
    // Show current configuration
    logger.info('Current configuration:');
    logger.info(`Active provider: ${settings.provider}`);
    logger.info('Configured providers:');

    if (settings.providers?.kimi?.apiKey) {
      logger.info(`  ✅ kimi (${settings.providers.kimi.endpoint})`);
    } else {
      logger.info(`  ❌ kimi (not configured)`);
    }

    if (settings.providers?.gemini?.apiKey) {
      const geminiEndpoint = settings.providers.gemini.endpoint || 'default';
      logger.info(`  ✅ gemini (${geminiEndpoint})`);
    } else {
      logger.info(`  ❌ gemini (not configured)`);
    }
  } else {
    logger.info('Available commands:');
    logger.info('  ai config show         - Show current configuration');
    logger.info('  ai config add          - Add a new provider');
    logger.info('  ai config switch <provider> - Switch active provider');
    logger.info('  ai config sync status  - Check iCloud sync status');
    logger.info('  ai config sync enable  - Enable iCloud sync');
    logger.info('  ai config sync disable - Disable iCloud sync');
  }
};

export default configCommand;
