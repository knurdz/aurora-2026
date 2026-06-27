#!/bin/bash
set -e

DOMAIN="verischolar.knurdz.org"

generate_secret() {
    if command -v openssl &> /dev/null; then
        openssl rand -base64 32
    else
        python3 - <<'PY'
import secrets
print(secrets.token_urlsafe(32))
PY
    fi
}

has_env_key() {
    grep -q "^$1=" .env 2>/dev/null
}

append_env_if_missing() {
    local key="$1"
    local value="$2"
    if ! has_env_key "$key"; then
        echo "$key=$value" >> .env
    fi
}

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

    echo ""
    echo "Google OAuth configuration"
    read -p "Google OAuth Client ID: " google_client_id
    read -p "Google OAuth Client Secret: " google_client_secret
    session_secret=$(generate_secret)
    api_key_pepper=$(generate_secret)

    cat <<EOF >> .env

FASTAPI_ENV=production
FRONTEND_BASE_URL=https://$DOMAIN
ALLOWED_CORS_ORIGINS=https://$DOMAIN
ALLOWED_CSRF_ORIGINS=https://$DOMAIN
APP_DB_PATH=/data/verischolar.sqlite3
GOOGLE_OAUTH_CLIENT_ID=$google_client_id
GOOGLE_OAUTH_CLIENT_SECRET=$google_client_secret
GOOGLE_OAUTH_REDIRECT_URI=https://$DOMAIN/api/auth/google/callback
SESSION_SECRET=$session_secret
SESSION_COOKIE_SECURE=true
API_KEY_PEPPER=$api_key_pepper
ENABLE_API_DOCS=false
EOF
    echo ".env file generated successfully."
else
    echo ".env file already exists. Skipping config generation."
fi

auth_env_updated=false
if ! has_env_key "GOOGLE_OAUTH_CLIENT_ID" || ! has_env_key "GOOGLE_OAUTH_CLIENT_SECRET"; then
    echo ""
    echo "Google OAuth configuration is required for the dashboard."
    read -p "Google OAuth Client ID: " google_client_id
    read -p "Google OAuth Client Secret: " google_client_secret
    {
        echo ""
        echo "# VeriScholar auth configuration"
    } >> .env
    append_env_if_missing "GOOGLE_OAUTH_CLIENT_ID" "$google_client_id"
    append_env_if_missing "GOOGLE_OAUTH_CLIENT_SECRET" "$google_client_secret"
    auth_env_updated=true
fi

append_env_if_missing "FASTAPI_ENV" "production"
append_env_if_missing "FRONTEND_BASE_URL" "https://$DOMAIN"
append_env_if_missing "ALLOWED_CORS_ORIGINS" "https://$DOMAIN"
append_env_if_missing "ALLOWED_CSRF_ORIGINS" "https://$DOMAIN"
append_env_if_missing "APP_DB_PATH" "/data/verischolar.sqlite3"
append_env_if_missing "GOOGLE_OAUTH_REDIRECT_URI" "https://$DOMAIN/api/auth/google/callback"
append_env_if_missing "SESSION_SECRET" "$(generate_secret)"
append_env_if_missing "SESSION_COOKIE_SECURE" "true"
append_env_if_missing "API_KEY_PEPPER" "$(generate_secret)"
append_env_if_missing "ENABLE_API_DOCS" "false"

if [ "$auth_env_updated" = true ]; then
    echo "Auth settings appended to .env."
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
