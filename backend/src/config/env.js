import dotenv from 'dotenv';

let loaded = false;
export function getEnv() {
  if (!loaded) {
    dotenv.config();
    loaded = true;
  }
  return {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT || 3001,
    DATABASE_URL: process.env.DATABASE_URL,
    STRIPE_SECRET: process.env.STRIPE_SECRET,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  };
}

export function requireEnv(keys = []) {
  const env = getEnv();
  const missing = keys.filter((k) => !env[k] || env[k] === '');
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
  return env;
}

