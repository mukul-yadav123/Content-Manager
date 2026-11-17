import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:3000'),

  MONGO_URI: z.string().default('mongodb://localhost:27017/linkedin_content_studio'),

  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),

  OPENAI_API_KEY: z.string().default('mock-key-replace-with-real-key'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_IMAGE_MODEL: z.string().default('dall-e-3'),

  CLOUDINARY_CLOUD_NAME: z.string().default('mock_cloud_name'),
  CLOUDINARY_API_KEY: z.string().default('mock_api_key'),
  CLOUDINARY_API_SECRET: z.string().default('mock_api_secret')
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables configuration:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
export default env;

