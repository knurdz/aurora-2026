#!/bin/bash
set -e

DOMAIN="verischolar.knurdz.org"

# Check prerequisites
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker and try again."
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

echo "====================================="
echo "VeriScholar VPS Deployment Setup"
echo "====================================="

if [ ! -f .env ]; then
    echo "No .env file found. Let's create one."
    
    read -p "Select LLM Provider (ollama/openai) [ollama]: " provider
    provider=${provider:-ollama}
    
    if [ "$provider" == "openai" ]; then
        read -p "OpenAI API Key: " api_key
        read -p "OpenAI Endpoint [https://api.openai.com]: " endpoint
        endpoint=${endpoint:-https://api.openai.com}
        read -p "OpenAI Model [gpt-4o-mini]: " model
        model=${model:-gpt-4o-mini}
        
        cat <<EOF > .env
LLM_PROVIDER=openai
OPENAI_API_KEY=$api_key
OPENAI_ENDPOINT=$endpoint
OPENAI_MODEL=$model
EOF
    else
        cat <<EOF > .env
LLM_PROVIDER=ollama
OLLAMA_MODEL=mistral
EOF
    fi
    echo ".env file generated successfully."
else
    echo ".env file already exists. Skipping config generation."
fi

echo "Deploying VeriScholar..."

# Pull and start services
if grep -q "LLM_PROVIDER=ollama" .env; then
    echo "Starting services with Ollama profile..."
    docker compose --profile ollama up -d --build
else
    echo "Starting services without Ollama..."
    docker compose up -d --build
fi

echo "Waiting for services to initialize..."
sleep 5

echo "====================================="
echo "VeriScholar is deployed and starting up."
echo "Frontend: https://$DOMAIN"
echo "Backend: https://$DOMAIN/api/health"
echo "====================================="
