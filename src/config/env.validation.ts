export interface EnvironmentVariables {
  MONGODB_URI: string;
  PORT?: number;
  JWT_SECRET: string;
  JWT_EXPIRES_IN?: string;
  REFRESH_TOKEN_EXPIRES_IN?: string;
  FRONTEND_URL?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  if (!config.MONGODB_URI) {
    throw new Error('MONGODB_URI is required in .env');
  }
  if (!config.JWT_SECRET) {
    config.JWT_SECRET = 'default_recipe_jwt_secret_key_2026';
  }
  return config as unknown as EnvironmentVariables;
}
