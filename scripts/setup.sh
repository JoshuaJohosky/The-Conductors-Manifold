#!/bin/bash

# The Conductor's Manifold - Setup Script
# Initializes the development environment

echo "🎵 The Conductor's Manifold - Setup"
echo "===================================="
echo ""

# Check for required tools
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed."; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3 is required but not installed."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }

echo "✅ All required tools are installed"
echo ""

# Create environment file
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOL
# The Conductor's Manifold - Environment Configuration

# API Keys
ALPHAVANTAGE_API_KEY=demo

# Database
DATABASE_URL=postgresql://manifold:manifold@localhost:5432/manifold_db

# Redis
REDIS_URL=redis://localhost:6379

# Security
SECRET_KEY=$(openssl rand -hex 32)
EOL
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

# Install Python dependencies
echo ""
echo "📦 Installing Python dependencies..."
cd backend
python3 -m pip install -r requirements.txt
cd ..
echo "✅ Python dependencies installed"

# Install Node dependencies
echo ""
echo "📦 Installing Node dependencies..."
cd frontend
npm install
cd ..
echo "✅ Node dependencies installed"

# Setup database
echo ""
echo "🗄️  Setting up database..."
docker-compose up -d postgres redis
sleep 5
echo "✅ Database containers started"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the application:"
echo "  docker-compose up"
echo ""
echo "Or run components separately:"
echo "  Backend:  cd backend && uvicorn api.main:app --reload"
echo "  Frontend: cd frontend && npm start"
echo ""
echo "© 2025 Joshua Johosky. All Rights Reserved."
