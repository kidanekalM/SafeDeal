#!/bin/bash

# SafeDeal Monolithic Application Startup Script

set -e

echo "🚀 Starting SafeDeal Monolithic Application..."

# Check if we're running in Docker or locally
if [ "$1" = "docker" ]; then
    echo "🐳 Running with Docker Compose..."
    docker-compose up --build
else
    echo "🔧 Checking prerequisites..."
    
    # Check if Go is installed
    if ! command -v go &> /dev/null; then
        echo "❌ Go is not installed. Please install Go 1.21+."
        exit 1
    fi
    
    # Check if PostgreSQL is available (optional for development)
    if ! nc -z localhost 5432; then
        echo "⚠️  PostgreSQL is not running. Please start PostgreSQL server."
        echo "💡 You can also use 'docker-compose up db' to start a PostgreSQL container."
    fi
    
    # Check if RabbitMQ is available (optional for development)
    if ! nc -z localhost 5672; then
        echo "⚠️  RabbitMQ is not running. Please start RabbitMQ server."
        echo "💡 You can also use 'docker-compose up rabbitmq' to start a RabbitMQ container."
    fi
    
    echo "📦 Installing dependencies..."
    go mod tidy
    
    echo "🏗️  Building application..."
    go build -o bin/app cmd/main.go
    
    echo "🏃 Running application..."
    ./bin/app
fi