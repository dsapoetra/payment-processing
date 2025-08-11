#!/bin/bash

# Payment Processing Platform - Database Setup Script
# This script sets up the PostgreSQL database for development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database configuration
DB_HOST=ep-blue-queen-a1qgr9nj-pooler.ap-southeast-1.aws.neon.tech
DB_PORT=5432
DB_USER=neondb_owner
DB_PASSWORD=npg_D9muJXo3YtRZ
DB_NAME=neondb

echo -e "${BLUE}🚀 Payment Processing Platform - Database Setup${NC}"
echo "=================================================="

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL is not installed. Please install PostgreSQL first.${NC}"
    echo "   macOS: brew install postgresql"
    echo "   Ubuntu: sudo apt-get install postgresql postgresql-contrib"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL is not running. Starting PostgreSQL...${NC}"
    
    # Try to start PostgreSQL (macOS with Homebrew)
    if command -v brew &> /dev/null; then
        brew services start postgresql
    else
        echo -e "${RED}❌ Please start PostgreSQL manually and run this script again.${NC}"
        exit 1
    fi
    
    # Wait for PostgreSQL to start
    sleep 3
fi

echo -e "${GREEN}✅ PostgreSQL is running${NC}"

# Create database user if it doesn't exist
echo -e "${BLUE}👤 Creating database user...${NC}"
psql -h $DB_HOST -p $DB_PORT -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || echo -e "${YELLOW}⚠️  User $DB_USER already exists${NC}"

# Grant privileges to user
psql -h $DB_HOST -p $DB_PORT -U postgres -c "ALTER USER $DB_USER CREATEDB;" 2>/dev/null

# Create database if it doesn't exist
echo -e "${BLUE}🗄️  Creating database...${NC}"
psql -h $DB_HOST -p $DB_PORT -U postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || echo -e "${YELLOW}⚠️  Database $DB_NAME already exists${NC}"

# Grant all privileges on database
psql -h $DB_HOST -p $DB_PORT -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null

echo -e "${GREEN}✅ Database setup completed successfully!${NC}"
echo ""
echo "Database Configuration:"
echo "======================"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Password: $DB_PASSWORD"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "1. Create a .env file in the project root with the following content:"
echo ""
echo "# Database Configuration"
echo "DATABASE_HOST=$DB_HOST"
echo "DATABASE_PORT=$DB_PORT"
echo "DATABASE_USERNAME=$DB_USER"
echo "DATABASE_PASSWORD=$DB_PASSWORD"
echo "DATABASE_NAME=$DB_NAME"
echo ""
echo "# JWT Configuration"
echo "JWT_SECRET=your-super-secret-jwt-key-here"
echo "JWT_EXPIRES_IN=3600"
echo ""
echo "# Application Configuration"
echo "PORT=3000"
echo "API_PREFIX=api/v1"
echo "NODE_ENV=development"
echo ""
echo "2. Run 'npm run start:dev' to start the application"
echo "3. Visit http://localhost:3000/api/v1/docs to view the Swagger documentation"
echo ""
echo -e "${GREEN}🎉 Happy coding!${NC}"
