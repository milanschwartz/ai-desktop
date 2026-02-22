#!/bin/bash
set -e

echo "🖥️  AI Desktop — Setting up dev environment..."

# Install pnpm if not available
if ! command -v pnpm &> /dev/null; then
  echo "📦 Installing pnpm..."
  npm install -g pnpm@9.15.0
fi

# Install dependencies
if [ -f "package.json" ]; then
  echo "📦 Installing dependencies..."
  pnpm install
fi

# Set up git hooks
if [ -f ".husky/pre-commit" ]; then
  echo "🐶 Setting up git hooks..."
  pnpm prepare
fi

# Wait for database to be ready
echo "⏳ Waiting for database..."
sleep 3

# Run migrations
if command -v pnpm &> /dev/null; then
  echo "🔄 Running database migrations..."
  pnpm db:migrate || echo "⚠️ Migrations failed or already run"
  
  echo "🌱 Seeding demo data..."
  pnpm seed || echo "⚠️ Seed failed or already seeded"
fi

echo ""
echo "✅ Dev environment ready!"
echo ""
echo "🚀 Quick Start:"
echo "   pnpm dev        # Start development servers"
echo ""
echo "🌐 URLs:"
echo "   Web:  http://localhost:5173"
echo "   API:  http://localhost:8080"
echo "   Docs: http://localhost:8080/docs"
echo ""
echo "👤 Demo Credentials:"
echo "   Email:    demo@ai-desktop.local"
echo "   Password: demo123456"
echo ""
