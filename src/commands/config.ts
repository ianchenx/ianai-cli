import { getSettings } from '../settings/get-settings';
import { saveSettings } from '../settings/save-settings';
import { logger } from '../utils/logger';
import { providerType, ProviderType, providerTypeList } from '../providers';
import { askQuestion } from '../ask-question';
import { appContext } from '../app-context';

export async function configureProvider(provider: ProviderType, rl: any) {
  const config: any = {};

  if (provider === providerType.gemini) {
    const geminiApiKey = await askQuestion(rl, 'Enter your Gemini API key: ');
    config.gemini = { apiKey: geminiApiKey };
  } else if (provider === providerType.kimi) {
    const kimiEndpoint =
      (await askQuestion(rl, 'Enter the API endpoint(default kimi): ')) ||
      'https://kimi.moonshot.cn/api';
    const kimiApiKey = await askQuestion(rl, 'Enter your Kimi auth token: ');
    config.kimi = { endpoint: kimiEndpoint, apiKey: kimiApiKey };
  }

  return config;
}

const configCommand = async (
  subcommand: string,
  key?: string,
  value?: string
) => {
  const settings = await getSettings();

  if (subcommand === 'add') {
    // 添加新的提供商配置
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

    // 检查是否已经配置过该提供商
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

      // 合并配置
      settings.providers = {
        ...settings.providers,
        ...providerConfig
      };

      saveSettings(settings);
      logger.success(`✅ Successfully added ${provider} configuration`);

      // 询问是否要切换到新配置的提供商
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
    // 显示当前配置
    logger.info('Current configuration:');
    logger.info(`Active provider: ${settings.provider}`);
    logger.info('Configured providers:');

    if (settings.providers?.kimi?.apiKey) {
      logger.info(`  ✅ kimi (${settings.providers.kimi.endpoint})`);
    } else {
      logger.info(`  ❌ kimi (not configured)`);
    }

    if (settings.providers?.gemini?.apiKey) {
      logger.info(`  ✅ gemini`);
    } else {
      logger.info(`  ❌ gemini (not configured)`);
    }
  } else {
    logger.info('Available commands:');
    logger.info('  ai config show         - Show current configuration');
    logger.info('  ai config add          - Add a new provider');
    logger.info('  ai config switch <provider> - Switch active provider');
  }
};

export default configCommand;
