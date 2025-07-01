import { getSettings } from '../settings/get-settings';
import { saveSettings } from '../settings/save-settings';
import { logger } from '../utils/logger';
import { providerType, ProviderType } from '../providers';

const configCommand = async (
  subcommand: string,
  key?: string,
  value?: string
) => {
  const settings = await getSettings();

  if (subcommand === 'switch') {
    // 切换提供商
    const provider = key as ProviderType;
    if (!provider || !Object.values(providerType).includes(provider)) {
      logger.error('Please specify a valid provider: kimi, gemini');
      logger.info('Usage: ai config switch <provider>');
      process.exit(1);
    }

    // 检查是否已配置该提供商
    if (provider === 'gemini' && !settings.providers?.gemini?.apiKey) {
      logger.error('Gemini not configured. Please run "ai --init" first.');
      process.exit(1);
    }
    if (provider === 'kimi' && !settings.providers?.kimi?.apiKey) {
      logger.error('Kimi not configured. Please run "ai --init" first.');
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
    logger.info('  ai config show       - Show current configuration');
    logger.info('  ai config switch <provider> - Switch active provider');
  }
};

export default configCommand;
