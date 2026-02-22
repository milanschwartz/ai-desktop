#!/bin/sh
set -e

echo "🚀 Starting AI Desktop API..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
until node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT 1').then(() => { pool.end(); process.exit(0); }).catch(() => process.exit(1));
" 2>/dev/null; do
  echo "   Database not ready, retrying in 2s..."
  sleep 2
done

echo "✅ Database is ready!"

# Run migrations
echo "🔄 Running database migrations..."
if [ -d "drizzle" ]; then
  node -e "
    const { drizzle } = require('drizzle-orm/node-postgres');
    const { migrate } = require('drizzle-orm/node-postgres/migrator');
    const { Pool } = require('pg');
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    
    migrate(db, { migrationsFolder: './drizzle' })
      .then(() => { console.log('✅ Migrations complete'); pool.end(); process.exit(0); })
      .catch((e) => { console.error('❌ Migration failed:', e); pool.end(); process.exit(1); });
  "
else
  echo "⚠️ No migrations folder found, skipping migrations"
fi

# Run seed if database is empty (check for users table)
echo "🌱 Checking if seed is needed..."
SEED_NEEDED=$(node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT COUNT(*) FROM users')
  .then((res) => { pool.end(); process.exit(res.rows[0].count === '0' ? 0 : 1); })
  .catch(() => { pool.end(); process.exit(0); });
" && echo "yes" || echo "no")

if [ "$SEED_NEEDED" = "yes" ]; then
  echo "🌱 Seeding database with demo data..."
  node dist/db/seed.js || echo "⚠️ Seed script not found or failed, continuing..."
else
  echo "✅ Database already seeded"
fi

echo "🎉 Starting server..."
exec node dist/index.js
