from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

import httpx

from core.config import settings


class LLMClient(ABC):
    """Unified interface for LLM text generation."""

    @abstractmethod
    def generate(self, prompt: str, temperature: float = 0.1,
                 max_tokens: int = 2048, json_mode: bool = False, timeout: float = 300.0) -> str:
        pass


class OllamaClient(LLMClient):
    """Uses local Ollama HTTP API."""

    def __init__(self, host: Optional[str] = None, model: Optional[str] = None):
        self.host = (host or settings.ollama_host).rstrip("/")
        self.model = model or settings.ollama_model

    def generate(self, prompt: str, temperature: float = 0.1,
                 max_tokens: int = 2048, json_mode: bool = False, timeout: float = 300.0) -> str:
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": temperature, "num_predict": max_tokens},
        }
        if json_mode:
            payload["format"] = "json"

        try:
            response = httpx.post(
                f"{self.host}/api/generate",
                json=payload,
                timeout=timeout,
            )
            response.raise_for_status()
            return response.json().get("response", "")
        except Exception as e:
            print(f"Ollama error: {e}")
            return ""


class OpenAIClient(LLMClient):
    """Uses OpenAI or compatible HTTP API (e.g., Azure OpenAI, vllm, litellm).
    
    Works with endpoint set as either:
      https://api.openai.com
      https://tantalum-resource.openai.azure.com/openai/v1   ← strips trailing /v1
    """
    def __init__(
        self,
        endpoint: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ):
        self.endpoint = endpoint or settings.openai_endpoint
        self.api_key = api_key if api_key is not None else settings.openai_api_key
        self.model = model or settings.openai_model

    def _base_url(self) -> str:
        """Normalize endpoint — strip trailing slash and /v1 so we never get /v1/v1/."""
        endpoint = self.endpoint.rstrip("/")
        if endpoint.endswith("/v1"):
            endpoint = endpoint[:-3]
        return endpoint

    def generate(self, prompt: str, temperature: float = 0.1,
                 max_tokens: int = 2048, json_mode: bool = False, timeout: float = 300.0) -> str:
        headers = {
            "Content-Type": "application/json"
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        url = f"{self._base_url()}/v1/chat/completions"
        try:
            response = httpx.post(url, headers=headers, json=payload, timeout=timeout)
            response.raise_for_status()
            data = response.json()
            return data.get("choices", [{}])[0].get("message", {}).get("content", "")
        except Exception as e:
            print(f"OpenAI error: {e}")
            return ""


def has_custom_llm_settings(ai_settings: Optional[Dict[str, Any]]) -> bool:
    return bool(
        ai_settings
        and str(ai_settings.get("endpoint") or "").strip()
        and str(ai_settings.get("model_name") or "").strip()
    )


def get_llm_client(ai_settings: Optional[Dict[str, Any]] = None) -> LLMClient:
    """Factory to get the configured LLM client."""
    if has_custom_llm_settings(ai_settings):
        return OpenAIClient(
            endpoint=str(ai_settings["endpoint"]).strip(),
            api_key=ai_settings.get("api_key"),
            model=str(ai_settings["model_name"]).strip(),
        )

    provider = settings.llm_provider.lower().strip()
    if provider == "openai":
        return OpenAIClient()
    return OllamaClient()


def llm_config_summary(ai_settings: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if has_custom_llm_settings(ai_settings):
        return {
            "llm_provider": "custom",
            "model_name": str(ai_settings["model_name"]).strip(),
            "endpoint": str(ai_settings["endpoint"]).strip(),
            "using_custom_ai": True,
            "api_key_configured": bool(ai_settings.get("api_key")),
            "updated_at": ai_settings.get("updated_at"),
        }

    provider = settings.llm_provider
    return {
        "llm_provider": provider,
        "model_name": settings.openai_model if provider == "openai" else settings.ollama_model,
        "endpoint": settings.openai_endpoint if provider == "openai" else settings.ollama_host,
        "using_custom_ai": False,
        "api_key_configured": bool(settings.openai_api_key) if provider == "openai" else False,
        "updated_at": None,
    }
