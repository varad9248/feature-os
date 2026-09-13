import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load root or local .env file
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  
  // PostgreSQL & Prisma
  POSTGRES_USER: z.string().default('postgres'),
  POSTGRES_PASSWORD: z.string().default('postgres'),
  POSTGRES_DB: z.string().default('featureos'),
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.coerce.number().default(5432),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/featureos?schema=public'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Kafka
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('featureos-api'),
  KAFKA_GROUP_ID: z.string().default('featureos-workers'),

  // ClickHouse
  CLICKHOUSE_HOST: z.string().default('http://localhost:8123'),
  CLICKHOUSE_USER: z.string().default('default'),
  CLICKHOUSE_PASSWORD: z.string().default(''),
  CLICKHOUSE_DB: z.string().default('featureos_analytics'),

  // Express API
  PORT: z.coerce.number().default(4000),
  API_URL: z.string().default('http://localhost:4000'),
  JWT_SECRET: z.string().min(16).default('super-secret-jwt-key-change-in-production-min-32-chars'),
  JWT_REFRESH_SECRET: z.string().min(16).default('super-secret-jwt-refresh-key-change-in-production-min-32-chars'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // AI Service
  AI_SERVICE_PORT: z.coerce.number().default(8000),
  AI_SERVICE_URL: z.string().default('http://localhost:8000'),
  OPENAI_API_KEY: z.string().optional().default('mock-openai-key'),
  MODEL_NAME: z.string().default('gpt-4o-mini'),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.format());
    throw new Error('Invalid environment configuration');
  }
  return parsed.data;
}

export const env = validateEnv();
