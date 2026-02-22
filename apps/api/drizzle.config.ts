import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? 'aidesktop',
    password: process.env.DB_PASSWORD ?? 'aidesktop',
    database: process.env.DB_NAME ?? 'aidesktop',
  },
});
