# AI Chat Template

A modern, feature-rich AI chat interface template built with Next.js. Users can configure their own API keys for multiple LLM providers, customize the interface, and integrate it into their projects. Perfect for developers who want to build AI-powered chat applications with their own API keys.

## 👤 Author

**Senol Dogan**  
📧 Email: senoldogan02@hotmail.com  
🔗 GitHub: [@senoldogann](https://github.com/senoldogann)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ✨ Features

### 🤖 Multiple LLM Providers
- **OpenAI** - GPT-4, GPT-4o, GPT-3.5-turbo, o1-preview, o1-mini
- **Anthropic** - Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
- **Google** - Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 1.5 Flash
- **Hugging Face** - Qwen3-Omni, Qwen2.5, Llama 3.1, Mistral, and more
- **Ollama** - Local and cloud models (Llama 3.1, Mistral, CodeLlama, etc.)
- **OpenRouter** - Access to multiple models through one API
- **QrokCloud** - Custom provider support
- **GitHub Copilot** - GitHub Copilot API integration

### 🎨 Modern UI/UX
- **Dark/Light Theme** - Automatic theme switching with system preference support
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **Real-time Streaming** - Live streaming responses with typing indicators
- **Message Editing** - Edit and resend messages
- **Message Search** - Full-text search across all conversations
- **Sidebar Navigation** - Collapsible sidebar with chat history
- **Image Support** - Upload and display images in chat
- **Markdown Rendering** - Beautiful markdown rendering with syntax highlighting

### 🛠️ Advanced Tools
- **Calculator** - High-precision mathematical calculations
- **Web Search** - DuckDuckGo integration for real-time web search
- **File Processing** - Support for CSV, JSON, Excel, and text files
- **Financial APIs** - Real-time financial data (stocks, crypto, forex)
- **Prompt Improvement** - AI-powered prompt enhancement
- **Native Function Calling** - AI can directly use tools during conversation

### 🔒 Security Features
- **Input Validation** - Comprehensive input sanitization and validation
- **Prompt Injection Prevention** - Advanced pattern detection and sanitization
- **CSRF Protection** - Built-in CSRF token validation
- **Rate Limiting** - Configurable rate limiting per user/IP
- **Security Headers** - XSS, clickjacking, and other security headers
- **Environment Validation** - Automatic environment variable validation

### 📊 Database & Storage
- **Prisma ORM** - Type-safe database access
- **PostgreSQL** - Production-ready database support
- **Message Persistence** - All conversations saved to database
- **Chat Management** - Create, delete, and manage multiple chats

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- PostgreSQL database (or use SQLite for development)
- At least one LLM provider API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-chat-template.git
   cd ai-chat-template
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory. You can copy the example file:
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` and fill in your values:
   ```env
   # Database (Required)
   DATABASE_URL="postgresql://user:password@localhost:5432/ai_chat"
   ```
   
   **Note:** LLM provider API keys are optional. You can configure them via the UI after starting the application. If you want to set default values for all users, you can add them to `.env`. See `.env.example` for all available options.

4. **Set up the database**
   ```bash
   # Generate Prisma Client
   npm run prisma:generate
   
   # Run migrations
   npm run prisma:migrate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Usage

### Basic Chat

1. Select a provider from the top bar (or configure one in the settings)
2. Type your message in the input field
3. Press Enter or click Send
4. The AI will respond with streaming text

### Advanced Features

#### Image Upload
- Click the `+` button in the input area
- Select "Upload Image"
- Choose an image file
- The image will be displayed in the chat and sent to the AI

#### Web Search
- Click the `+` button in the input area
- Select "Web Search"
- Type your search query
- The AI will search the web and provide up-to-date information

#### Prompt Improvement
- Click the `+` button in the input area
- Select "Improve Prompt"
- Type your prompt
- The AI will suggest improvements

#### Message Editing
- Click on any message you sent
- Click the edit icon
- Modify the message
- Click "Resend" to send the updated message

#### Search Conversations
- Click the search icon in the sidebar
- Type your search query
- Browse through matching messages

## ⚙️ Configuration

### LLM Provider Configuration

You can configure providers in two ways:

#### 1. UI Configuration (Recommended)

Configure providers directly in the UI:
1. Click on the provider name in the top bar
2. Select "Configure Provider"
3. Enter your API key and settings
4. Click "Save"

Your settings will be saved to your browser's local storage and persist across page refreshes.

#### 2. Environment Variables (Optional - for Default Values)

If you want to set default values for all users, add provider configuration to your `.env` file:

```env
# Provider selection
LLM_PROVIDER=openai

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=2000

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_TEMPERATURE=0.7

# Google
GOOGLE_API_KEY=...
GOOGLE_MODEL=gemini-2.0-flash-exp
GOOGLE_TEMPERATURE=0.7

# Hugging Face
HF_API=hf_...
HUGGINGFACE_MODEL=Qwen/Qwen3-Omni-30B-A3B-Instruct

# Ollama (Local)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1

# Ollama (Cloud)
OLLAMA_API_KEY=...
OLLAMA_BASE_URL=https://ollama.com/api
OLLAMA_MODEL=deepseek-v3.1:671b-cloud
```

**Note:** Environment variables are optional. Users can configure their API keys via the UI, which will be saved to their browser's local storage.

### Database Configuration

#### PostgreSQL (Production)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/ai_chat"
```

#### SQLite (Development)

```env
DATABASE_URL="file:./dev.db"
```

### Security Configuration

The template includes built-in security features. You can customize them in:

- `lib/security/validation.ts` - Input validation rules
- `lib/prompt-sanitizer.ts` - Prompt injection prevention
- `lib/security/rate-limiter.ts` - Rate limiting configuration
- `middleware.ts` - Security headers and CSRF protection

## 🏗️ Project Structure

```
ai-chat-template/
├── app/
│   ├── api/              # API routes
│   │   ├── chat/         # Chat API endpoints
│   │   ├── chats/        # Chat management
│   │   ├── llm/          # LLM provider configuration
│   │   └── tools/        # Tool endpoints
│   ├── components/       # React components
│   │   ├── Chat.tsx      # Main chat component
│   │   ├── InputArea.tsx # Input component
│   │   ├── MessageBubble.tsx # Message display
│   │   └── ...
│   ├── contexts/         # React contexts
│   └── types/           # TypeScript types
├── lib/
│   ├── llm/             # LLM provider implementations
│   │   └── providers/   # Individual provider files
│   ├── security/        # Security utilities
│   ├── tools/           # Tool implementations
│   └── utils/           # Utility functions
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── migrations/      # Database migrations
└── public/              # Static assets
```

## 🔧 API Documentation

### Chat API

#### POST `/api/chat`

Send a message to the AI.

**Request Body:**
```json
{
  "message": "Hello, how are you?",
  "chatId": "optional-chat-id",
  "provider": "openai",
  "model": "gpt-4o",
  "temperature": 0.7,
  "max_tokens": 1000,
  "stream": true
}
```

**Response:**
- Streaming response (SSE format)
- Or JSON response if `stream: false`

### Chat Management API

#### GET `/api/chats`

Get all chats.

#### POST `/api/chats`

Create a new chat.

#### GET `/api/chats/[chatId]`

Get a specific chat.

#### DELETE `/api/chats/[chatId]`

Delete a chat.

### LLM Provider API

#### GET `/api/llm/providers`

Get available LLM providers.

#### GET `/api/llm/config?provider=openai`

Get provider configuration.

#### POST `/api/llm/config`

Update provider configuration (session-based).

## 🛠️ Development

### Running in Development Mode

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm start
```

### Database Management

```bash
# Generate Prisma Client
npm run prisma:generate

# Create a new migration
npm run prisma:migrate

# Open Prisma Studio (database GUI)
npm run prisma:studio
```

### Linting

```bash
npm run lint
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](docs/CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

For quick start:
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [React Markdown](https://github.com/remarkjs/react-markdown) - Markdown rendering
- All LLM providers for their amazing APIs

## 📚 Documentation

- [Contributing Guide](docs/CONTRIBUTING.md) - How to contribute to this project
- [Changelog](docs/CHANGELOG.md) - Project changelog and version history
- [Tools Integration](docs/TOOLS_INTEGRATION.md) - How tools are integrated with LLM providers

## 📧 Support

If you have any questions or need help, please:
- Open an issue on [GitHub](https://github.com/senoldogann/ai-chat-template/issues)
- Check the [documentation](docs/)

## 🗺️ Roadmap

Gelecekte eklenmesi planlanan özellikler:

- [ ] **Voice input/output support** - Sesli mesaj gönderme ve alma
- [ ] **Multi-language support** - UI ve AI için çoklu dil desteği
- [ ] **Plugin system for custom tools** - Özel tool'lar için plugin sistemi
- [ ] **Export conversations** - Konuşmaları PDF, Markdown, JSON olarak dışa aktarma
- [ ] **Collaborative chat rooms** - Birden fazla kullanıcının aynı chat'te çalışabilmesi
- [ ] **Custom model fine-tuning** - Kendi veri setinizle model eğitme
- [ ] **Advanced analytics dashboard** - Kullanım istatistikleri ve analitik

Detaylı bilgi için [Roadmap Dokümantasyonu](docs/ROADMAP.md) sayfasına bakın.

---

Made with ❤️ by [Senol Dogan](https://github.com/senoldogann)
