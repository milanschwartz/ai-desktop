import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'es2022',
  clean: true,
  splitting: true,
  sourcemap: true,
  // Externalize native modules and dependencies with dynamic requires
  external: [
    'ws',
    '@node-rs/argon2',
    'pg',
    'drizzle-orm',
    'drizzle-orm/pg-core',
    'drizzle-orm/node-postgres',
  ],
  // Don't bundle node_modules
  noExternal: [],
  esbuildOptions(options) {
    options.platform = 'node';
  },
});
