import { Pool } from 'pg';

async function resetDatabase() {
  if (process.env.NODE_ENV === 'production') {
    console.error('🚨 Reset cannot run in production!');
    process.exit(1);
  }

  const pool = new Pool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? 'aidesktop',
    password: process.env.DB_PASSWORD ?? 'aidesktop',
    database: process.env.DB_NAME ?? 'aidesktop',
  });

  console.log('Dropping all tables...');

  await pool.query(`
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO aidesktop;
    GRANT ALL ON SCHEMA public TO public;
  `);

  console.log('Tables dropped. Run migrations and seed.');

  await pool.end();
}

resetDatabase().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
