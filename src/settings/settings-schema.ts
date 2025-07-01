import { z } from 'zod';

import { settingsDir } from '../constants/settings-constants';
import { logger } from '../utils/logger';
import { providerType } from '../providers';

export const settingsSchema = z.object({
  providers: z
    .object({
      kimi: z
        .object({
          endpoint: z.string().url().default('https://kimi.moonshot.cn/api'),
          apiKey: z.string()
        })
        .optional(),
      gemini: z
        .object({
          endpoint: z.string().url().optional(),
          apiKey: z.string()
        })
        .optional()
    })
    .default({}),

  metadata: z.record(z.any()).optional(),
  payload: z.record(z.string()).optional(),
  commitment: z
    .object({
      generate: z.number().max(10).optional(),
      maxlength: z.number().max(100).optional(),
      type: z.enum(['', 'conventional']).optional().default('')
    })
    .default({ generate: 1, maxlength: 60, type: '' }),
  proxy: z.string().url().optional(),
  provider: z.enum(['kimi', 'gemini']).default('kimi')
});

export type Settings = z.infer<typeof settingsSchema>;

export function getDefaults<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): z.infer<z.ZodObject<T>> {
  return schema.parse({});
}

export function validateSettings(settings) {
  const result = settingsSchema.safeParse(settings);
  if (!result.success) {
    for (const error of result.error.issues) {
      let deepField: number | string | undefined;
      if (error.path.length > 1) deepField = error.path.at(-1);
      logger.error(`settings.json: '${deepField}' ${error.message}`);
    }

    logger.error(
      `\nPlease check the parameters you've provided to ensure they're correct. Additionally, You can edit your settings file at file://${settingsDir}. If the issue persists, you can reset to default settings by running ai --init.`
    );
    process.exit(1);
  }
}
