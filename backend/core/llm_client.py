import httpx
from abc import ABC, abstractmethod
from core.config import settings

class LLMClient(ABC):
    """Unified interface for LLM text generation."""
    @abstractmethod
    def generate(self, prompt: str, temperature: float = 0.1,
                 max_tokens: int = 2048, json_mode: bool = False, timeout: float = 300.0) -> str:
        pass

class OllamaClient(LLMClient):
    """Uses local Ollama HTTP API."""
    def generate(self, prompt: str, temperature: float = 0.1,
                 max_tokens: int = 2048, json_mode: bool = False, timeout: float = 300.0) -> str:
        payload = {
            "model": settings.ollama_model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": temperature, "num_predict": max_tokens},
        }
        if json_mode:
            payload["format"] = "json"

        try:
            response = httpx.post(
                f"{settings.ollama_host}/api/generate",
                json=payload,
                timeout=timeout,
            )
            response.raise_for_status()
            return response.json().get("response", "")
        except Exception as e:
            print(f"Ollama error: {e}")
            return ""

class OpenAIClient(LLMClient):
    """Uses OpenAI or compatible HTTP API (e.g., vllm, litellm)."""
    def generate(self, prompt: str, temperature: float = 0.1,
                 max_tokens: int = 2048, json_mode: bool = False, timeout: float = 300.0) -> str:
        headers = {
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": settings.openai_model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        try:
            response = httpx.post(
                f"{settings.openai_endpoint}/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=timeout,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("choices", [{}])[0].get("message", {}).get("content", "")
        except Exception as e:
            print(f"OpenAI error: {e}")
            return ""

def get_llm_client() -> LLMClient:
    """Factory to get the configured LLM client."""
    provider = settings.llm_provider.lower().strip()
    if provider == "openai":
        return OpenAIClient()
    return OllamaClient()
