# 🛠️ Tools Entegrasyonu - Provider'lara Nasıl Entegre Edilir?

Bu doküman, tools'ların her LLM provider'a nasıl entegre edileceğini açıklar.

## 📋 Genel Bakış

Tools'lar, AI'ın native function calling yeteneklerini kullanarak doğrudan fonksiyonları çağırmasına izin verir. Her provider'ın kendi function calling format'ı vardır, ancak biz OpenAI format'ını standart olarak kullanıyoruz ve provider'a göre dönüştürüyoruz.

## 🔄 Tools Entegrasyon Akışı

### 1. Tools Tanımlama (`lib/tools/index.ts`)

```typescript
export const TOOLS = {
  calculate: {
    name: 'calculate',
    description: 'Performs mathematical calculations',
    execute: async (args: { expression: string; precision?: number }) => {
      // Tool implementation
    },
  },
  // ... diğer tools
};
```

### 2. Tools'u OpenAI Format'ına Çevirme (`app/api/chat/route.ts`)

```typescript
function convertToolsToFunctionFormat() {
  return [
    {
      type: 'function',
      function: {
        name: 'calculate',
        description: 'Performs mathematical calculations',
        parameters: {
          type: 'object',
          properties: {
            expression: { type: 'string', description: 'Math expression' },
            precision: { type: 'number', description: 'Decimal places' },
          },
          required: ['expression'],
        },
      },
    },
    // ... diğer tools
  ];
}
```

### 3. Provider'a Göre Format Dönüşümü

Her provider'ın kendi function calling format'ı vardır:

#### OpenAI (OpenAI, OpenRouter, QrokCloud, GitHub Copilot)
- **Format**: OpenAI native format (direkt kullanılabilir)
- **Parametre**: `tools` ve `tool_choice`
- **Örnek**:
```typescript
{
  tools: [
    {
      type: 'function',
      function: {
        name: 'calculate',
        description: '...',
        parameters: { ... }
      }
    }
  ],
  tool_choice: 'auto'
}
```

#### Anthropic (Claude)
- **Format**: Anthropic native format (dönüştürme gerekli)
- **Parametre**: `tools` (array of tool objects)
- **Dönüşüm**:
```typescript
const anthropicTools = request.tools?.map(tool => ({
  name: tool.function.name,
  description: tool.function.description,
  input_schema: tool.function.parameters,
}));
```

#### Google (Gemini)
- **Format**: Gemini native format (dönüştürme gerekli)
- **Parametre**: `tools` (array with `function_declarations`)
- **Dönüşüm**:
```typescript
const geminiTools = request.tools ? [{
  function_declarations: request.tools.map(tool => ({
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters,
  })),
}] : undefined;
```

#### Ollama
- **Format**: OpenAI-compatible (direkt kullanılabilir)
- **Parametre**: `tools` ve `tool_choice`
- **Not**: Ollama'nın bazı modelleri function calling destekler

#### Hugging Face
- **Format**: Model'e bağlı (çoğu model OpenAI format'ını destekler)
- **Parametre**: Model'e göre değişir
- **Not**: Qwen3-Omni gibi bazı modeller function calling destekler

## 🔧 Provider Implementation Örnekleri

### OpenAI Provider (`lib/llm/providers/openai.ts`)

```typescript
async chat(request: LLMRequest): Promise<LLMResponse> {
  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    body: JSON.stringify({
      model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
      // Tools direkt kullanılabilir
      ...(request.tools && { tools: request.tools }),
      ...(request.tool_choice && { tool_choice: request.tool_choice }),
    }),
  });
}
```

### Anthropic Provider (`lib/llm/providers/anthropic.ts`)

```typescript
async chat(request: LLMRequest): Promise<LLMResponse> {
  // OpenAI format'ını Anthropic format'ına dönüştür
  const anthropicTools = request.tools?.map(tool => ({
    name: tool.function.name,
    description: tool.function.description,
    input_schema: tool.function.parameters,
  }));

  const response = await fetch(`${baseURL}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
      // Anthropic format tools
      ...(anthropicTools && anthropicTools.length > 0 && { tools: anthropicTools }),
    }),
  });
}
```

### Google Provider (`lib/llm/providers/google.ts`)

```typescript
async chat(request: LLMRequest): Promise<LLMResponse> {
  // OpenAI format'ını Gemini format'ına dönüştür
  const geminiTools = request.tools ? [{
    function_declarations: request.tools.map(tool => ({
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters,
    })),
  }] : undefined;

  const response = await fetch(`${baseURL}/${model}:generateContent`, {
    method: 'POST',
    body: JSON.stringify({
      contents: request.messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
      generationConfig: {
        temperature: request.temperature,
        maxOutputTokens: request.max_tokens,
      },
      // Gemini format tools
      ...(geminiTools && { tools: geminiTools }),
    }),
  });
}
```

## 📝 Yeni Provider Eklerken

1. **LLMRequest interface'ini kontrol et**: `tools` ve `tool_choice` parametreleri var mı?
2. **Provider'ın function calling format'ını öğren**: API dokümantasyonuna bak
3. **Format dönüşümü ekle**: OpenAI format'ını provider format'ına çevir
4. **Test et**: Tools'ların doğru çalıştığını doğrula

## 🎯 Mevcut Durum

- ✅ **OpenAI**: Native function calling desteği eklendi
- ✅ **Anthropic**: Tools format dönüşümü eklendi
- ✅ **Google**: Tools format dönüşümü eklendi
- ⚠️ **Ollama**: Model'e bağlı (çoğu model destekler)
- ⚠️ **Hugging Face**: Model'e bağlı (Qwen3-Omni destekler)
- ⚠️ **OpenRouter**: OpenAI format'ını kullanır (direkt çalışır)
- ⚠️ **QrokCloud**: OpenAI format'ını kullanır (direkt çalışır)
- ⚠️ **GitHub Copilot**: OpenAI format'ını kullanır (direkt çalışır)

## 🔮 Gelecek İyileştirmeler

1. **Function Call Response Handling**: AI'dan gelen function call'ları parse et ve execute et
2. **Multi-turn Function Calling**: Birden fazla function call'ı handle et
3. **Tool Result Formatting**: Tool sonuçlarını AI'ın anlayabileceği formata çevir
4. **Provider-specific Tool Limits**: Her provider'ın tool limit'lerini handle et
5. **Tool Validation**: Tool parametrelerini validate et

## 📚 Kaynaklar

- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Anthropic Tools](https://docs.anthropic.com/claude/docs/tool-use)
- [Google Gemini Function Calling](https://ai.google.dev/docs/function_calling)
- [Ollama Function Calling](https://github.com/ollama/ollama/blob/main/docs/function-calling.md)

