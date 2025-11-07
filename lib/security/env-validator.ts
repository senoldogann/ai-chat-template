/**
 * Environment Variable Validator
 * Validates all required environment variables at startup
 */

/**
 * Required environment variables
 */
export const REQUIRED_ENV_VARS = {
  DATABASE_URL: {
    required: true,
    pattern: /^(postgresql:\/\/|file:)/,
    message: 'DATABASE_URL must be a valid PostgreSQL connection string or SQLite file path',
  },
  // LLM Provider API keys are optional - users can configure them via UI
} as const;

/**
 * Optional environment variables with validation
 */
export const OPTIONAL_ENV_VARS = {
  // LLM Provider API Keys (all optional - users can configure via UI)
  LLM_PROVIDER: {
    required: false,
    pattern: /^(openai|anthropic|google|ollama|openrouter|qrokcloud|github-copilot|huggingface)$/,
    message: 'LLM_PROVIDER must be one of: openai, anthropic, google, ollama, openrouter, qrokcloud, github-copilot, huggingface',
  },
  // OpenAI
  OPENAI_API_KEY: {
    required: false,
    minLength: 20,
    message: 'OPENAI_API_KEY must be at least 20 characters long if provided',
  },
  OPENAI_BASE_URL: {
    required: false,
    pattern: /^https?:\/\//,
    message: 'OPENAI_BASE_URL must be a valid URL if provided',
  },
  // Anthropic
  ANTHROPIC_API_KEY: {
    required: false,
    minLength: 20,
    message: 'ANTHROPIC_API_KEY must be at least 20 characters long if provided',
  },
  ANTHROPIC_BASE_URL: {
    required: false,
    pattern: /^https?:\/\//,
    message: 'ANTHROPIC_BASE_URL must be a valid URL if provided',
  },
  // Google
  GOOGLE_API_KEY: {
    required: false,
    minLength: 10,
    message: 'GOOGLE_API_KEY must be at least 10 characters long if provided',
  },
  GOOGLE_BASE_URL: {
    required: false,
    pattern: /^https?:\/\//,
    message: 'GOOGLE_BASE_URL must be a valid URL if provided',
  },
  // Hugging Face (supports multiple env var names)
  HF_API_KEY: {
    required: false,
    minLength: 10,
    message: 'HF_API_KEY must be at least 10 characters long if provided',
  },
  HF_API: {
    required: false,
    minLength: 10,
    message: 'HF_API must be at least 10 characters long if provided',
  },
  HUGGINGFACE_API_KEY: {
    required: false,
    minLength: 10,
    message: 'HUGGINGFACE_API_KEY must be at least 10 characters long if provided',
  },
  HUGGINGFACE_BASE_URL: {
    required: false,
    pattern: /^https?:\/\//,
    message: 'HUGGINGFACE_BASE_URL must be a valid URL if provided',
  },
  // Ollama
  OLLAMA_API_KEY: {
    required: false,
    minLength: 10,
    message: 'OLLAMA_API_KEY must be at least 10 characters long if provided',
  },
  OLLAMA_BASE_URL: {
    required: false,
    pattern: /^https?:\/\//,
    message: 'OLLAMA_BASE_URL must be a valid URL if provided',
  },
  // OpenRouter
  OPENROUTER_API_KEY: {
    required: false,
    minLength: 20,
    message: 'OPENROUTER_API_KEY must be at least 20 characters long if provided',
  },
  OPENROUTER_BASE_URL: {
    required: false,
    pattern: /^https?:\/\//,
    message: 'OPENROUTER_BASE_URL must be a valid URL if provided',
  },
  // QrokCloud
  QROKCLOUD_API_KEY: {
    required: false,
    minLength: 10,
    message: 'QROKCLOUD_API_KEY must be at least 10 characters long if provided',
  },
  QROKCLOUD_BASE_URL: {
    required: false,
    pattern: /^https?:\/\//,
    message: 'QROKCLOUD_BASE_URL must be a valid URL if provided',
  },
  // GitHub Copilot
  GITHUB_COPILOT_API_KEY: {
    required: false,
    minLength: 10,
    message: 'GITHUB_COPILOT_API_KEY must be at least 10 characters long if provided',
  },
  GITHUB_COPILOT_BASE_URL: {
    required: false,
    pattern: /^https?:\/\//,
    message: 'GITHUB_COPILOT_BASE_URL must be a valid URL if provided',
  },
  // Tools
  ALPHA_VANTAGE_API_KEY: {
    required: false,
    minLength: 10,
    message: 'ALPHA_VANTAGE_API_KEY must be at least 10 characters long if provided',
  },
  // Security & CORS
  ALLOWED_ORIGIN: {
    required: false,
    pattern: /^https?:\/\/|^\*$/,
    message: 'ALLOWED_ORIGIN must be a valid URL or *',
  },
  APP_URL: {
    required: false,
    pattern: /^https?:\/\//,
    message: 'APP_URL must be a valid URL if provided',
  },
} as const;

/**
 * Validate environment variable
 */
function validateEnvVar(
  name: string,
  value: string | undefined,
  config: {
    required: boolean;
    pattern?: RegExp;
    minLength?: number;
    message: string;
  }
): { valid: boolean; error?: string } {
  // Check if required
  if (config.required && !value) {
    return {
      valid: false,
      error: `${name} is required. ${config.message}`,
    };
  }

  // If not required and not provided, skip validation
  if (!config.required && !value) {
    return { valid: true };
  }

  // Check minimum length
  if (config.minLength && value && value.length < config.minLength) {
    return {
      valid: false,
      error: `${name} ${config.message}`,
    };
  }

  // Check pattern
  if (config.pattern && value && !config.pattern.test(value)) {
    return {
      valid: false,
      error: `${name} ${config.message}`,
    };
  }

  return { valid: true };
}

/**
 * Validate all environment variables
 */
export function validateEnvironmentVariables(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate required variables
  for (const [name, config] of Object.entries(REQUIRED_ENV_VARS)) {
    const value = process.env[name];
    const validation = validateEnvVar(name, value, config);
    
    if (!validation.valid) {
      errors.push(validation.error || `${name} validation failed`);
    }
  }

  // LLM Provider API keys are optional - users can configure them via UI
  // No validation needed here as users will enter their API keys in the UI

  // Validate optional variables (if provided)
  for (const [name, config] of Object.entries(OPTIONAL_ENV_VARS)) {
    const value = process.env[name];
    if (value) {
      const validation = validateEnvVar(name, value, config);
      
      if (!validation.valid) {
        errors.push(validation.error || `${name} validation failed`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate environment variables at startup
 */
export function validateEnvAtStartup(): void {
  const validation = validateEnvironmentVariables();
  
  if (!validation.valid) {
    console.error('❌ Environment variable validation failed:');
    validation.errors.forEach((error) => {
      console.error(`  - ${error}`);
    });
    throw new Error('Environment variable validation failed. Please check your .env file.');
  }
  
  console.log('✅ Environment variables validated successfully');
}

