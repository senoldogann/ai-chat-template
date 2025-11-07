# 🤖 LLM Provider Entegrasyonu

## ✅ Desteklenen Provider'lar

Proje artık **7 farklı LLM provider**'ı destekliyor:

1. **OpenAI** - GPT-4, GPT-3.5-turbo, GPT-4o
2. **Anthropic** - Claude 3.5 Sonnet, Claude 3 Opus
3. **Google** - Gemini Pro, Gemini 1.5 Pro
4. **Ollama** - Local/self-hosted models (Llama 3.1, Mistral, CodeLlama)
5. **OpenRouter** - Multiple models through one API
6. **QrokCloud** - Custom provider
7. **GitHub Copilot** - GitHub Copilot API

---

## 🔧 Kurulum

### 1. Environment Variables (.env)

Her provider için API key'lerini `.env` dosyasına ekleyin:

```env
# Database (Required)
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Default Provider (Optional - hangi provider kullanılacak)
LLM_PROVIDER=openai

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1  # Optional
OPENAI_MODEL=gpt-4  # Optional
OPENAI_TEMPERATURE=0.7  # Optional
OPENAI_MAX_TOKENS=1000  # Optional

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_BASE_URL=https://api.anthropic.com/v1  # Optional
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022  # Optional
ANTHROPIC_TEMPERATURE=0.7  # Optional
ANTHROPIC_MAX_TOKENS=1000  # Optional

# Google
GOOGLE_API_KEY=...
GOOGLE_BASE_URL=https://generativelanguage.googleapis.com/v1beta  # Optional
GOOGLE_MODEL=gemini-pro  # Optional
GOOGLE_TEMPERATURE=0.7  # Optional
GOOGLE_MAX_TOKENS=1000  # Optional

# Ollama (Local/self-hosted)
OLLAMA_BASE_URL=http://localhost:11434  # Required
OLLAMA_MODEL=llama3.1  # Optional
OLLAMA_TEMPERATURE=0.7  # Optional
OLLAMA_MAX_TOKENS=1000  # Optional

# OpenRouter
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1  # Optional
OPENROUTER_MODEL=openai/gpt-4  # Optional
OPENROUTER_TEMPERATURE=0.7  # Optional
OPENROUTER_MAX_TOKENS=1000  # Optional

# QrokCloud
QROKCLOUD_API_KEY=...
QROKCLOUD_BASE_URL=https://api.qrokcloud.com  # Required
QROKCLOUD_MODEL=default  # Optional
QROKCLOUD_TEMPERATURE=0.7  # Optional
QROKCLOUD_MAX_TOKENS=1000  # Optional

# GitHub Copilot
GITHUB_COPILOT_API_KEY=...
GITHUB_COPILOT_BASE_URL=https://api.githubcopilot.com/v1  # Optional
GITHUB_COPILOT_MODEL=gpt-4  # Optional
GITHUB_COPILOT_TEMPERATURE=0.7  # Optional
GITHUB_COPILOT_MAX_TOKENS=1000  # Optional
```

### 2. En Az Bir Provider Gerekli

En az bir provider'ın API key'i veya base URL'i (Ollama için) ayarlanmalı.

---

## 📡 API Kullanımı

### Chat API

**Endpoint**: `POST /api/chat`

**Request Body**:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Merhaba!"
    }
  ],
  "provider": "openai",  // Optional - default provider kullanılır
  "model": "gpt-4",  // Optional - provider'ın default model'i kullanılır
  "temperature": 0.7,  // Optional
  "max_tokens": 1000,  // Optional
  "stream": true,  // Optional - default: true
  "chatId": "uuid"  // Optional - database'e kaydetmek için
}
```

**Response** (Streaming):
```
data: {"choices":[{"delta":{"content":"Merhaba"}}],"model":"gpt-4"}

data: {"choices":[{"delta":{"content":"!"}}],"model":"gpt-4"}

data: [DONE]
```

**Response** (Non-streaming):
```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Merhaba! Size nasıl yardımcı olabilirim?"
      }
    }
  ],
  "model": "gpt-4",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 15,
    "total_tokens": 25
  }
}
```

### Provider Listesi API

**Endpoint**: `GET /api/llm/providers`

**Response**:
```json
{
  "available": ["openai", "anthropic", "google"],
  "default": "openai",
  "providers": {
    "openai": {
      "name": "OpenAI",
      "models": ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo", "gpt-4o"],
      "envKey": "OPENAI_API_KEY"
    },
    "anthropic": {
      "name": "Anthropic",
      "models": ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229"],
      "envKey": "ANTHROPIC_API_KEY"
    },
    ...
  }
}
```

---

## 🔄 Provider Değiştirme

### 1. Environment Variable ile

`.env` dosyasında `LLM_PROVIDER` değişkenini ayarlayın:

```env
LLM_PROVIDER=anthropic
```

### 2. API Request ile

Her request'te `provider` parametresini gönderin:

```json
{
  "provider": "google",
  "messages": [...]
}
```

---

## 🎯 Örnek Kullanımlar

### OpenAI ile Chat

```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'openai',
    model: 'gpt-4',
    messages: [
      { role: 'user', content: 'Merhaba!' }
    ],
    stream: true,
  }),
});
```

### Ollama ile Chat (Local)

```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'ollama',
    model: 'llama3.1',
    messages: [
      { role: 'user', content: 'Merhaba!' }
    ],
    stream: true,
  }),
});
```

### OpenRouter ile Chat (Multiple Models)

```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'openrouter',
    model: 'meta-llama/llama-3.1-70b-instruct',
    messages: [
      { role: 'user', content: 'Merhaba!' }
    ],
    stream: true,
  }),
});
```

---

## 🏗️ Mimari

### Provider Interface

Tüm provider'lar unified bir interface kullanır:

```typescript
interface LLMProviderInterface {
  name: LLMProvider;
  chat(request: LLMRequest): Promise<LLMResponse>;
  stream(request: LLMRequest): Promise<ReadableStream<LLMStreamChunk>>;
  validateConfig(config: LLMProviderConfig): boolean;
}
```

### Provider Factory

Provider'lar factory pattern ile oluşturulur:

```typescript
import { createLLMProvider } from '@/lib/llm/providers';

const provider = createLLMProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-4',
});
```

---

## 🔒 Güvenlik

- ✅ API key'ler environment variables'da saklanır
- ✅ Provider config validation
- ✅ Input validation (tüm provider'larda)
- ✅ Error handling (sensitive bilgi sızıntısı yok)
- ✅ Rate limiting (middleware'de)

---

## 📝 Notlar

1. **Ollama**: API key gerektirmez, sadece `OLLAMA_BASE_URL` gerekli
2. **QrokCloud**: `QROKCLOUD_BASE_URL` zorunlu
3. **OpenRouter**: Multiple models destekler (format: `provider/model`)
4. **GitHub Copilot**: GitHub Copilot API key gerekli
5. **Default Provider**: `LLM_PROVIDER` env variable ile ayarlanır

---

## 🚀 Sonuç

Artık projeniz **7 farklı LLM provider**'ı destekliyor ve sadece API key ile kolayca kullanabilirsiniz!

**Durum**: ✅ **PRODUCTION-READY** - Tüm provider'lar entegre edildi!

