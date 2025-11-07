'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';

/**
 * Provider Configuration Component
 * Allows users to configure provider settings (API keys, URLs, etc.)
 */

interface ProviderConfigProps {
  provider: string | null;
  onConfigUpdate?: (config: { apiKey?: string; model?: string; temperature?: number; maxTokens?: number; baseURL?: string }) => void;
  isStandalone?: boolean; // If true, don't render modal wrapper (already rendered in parent)
}

export default function ProviderConfig({ provider, onConfigUpdate, isStandalone = false }: ProviderConfigProps) {
  const _theme = useTheme(); // Keep for future use
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<{ hasApiKey?: boolean; model?: string; defaultTemperature?: number; defaultMaxTokens?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    apiKey: '',
    model: '',
    temperature: '',
    maxTokens: '',
  });

  useEffect(() => {
    if (provider && isOpen) {
      loadConfig();
    }
  }, [provider, isOpen]);

  const loadConfig = async () => {
    if (!provider) return;

    setLoading(true);
    try {
      // First, try to load from localStorage (user's saved settings)
      let savedConfig: { apiKey?: string; model?: string; temperature?: number; maxTokens?: number } | null = null;
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem('ai-chat-provider-configs');
          if (saved) {
            const allConfigs = JSON.parse(saved);
            savedConfig = allConfigs[provider];
          }
        } catch (error) {
          console.error('Error loading config from localStorage:', error);
        }
      }
      
      // Then, load from .env (default config)
      const response = await fetch(`/api/llm/config?provider=${provider}`);
      let envConfig: { hasApiKey?: boolean; model?: string; defaultTemperature?: number; defaultMaxTokens?: number } | null = null;
      if (response.ok) {
        envConfig = await response.json();
        setConfig(envConfig);
      }
      
      // Use saved config if available, otherwise use env config
      if (savedConfig) {
        // User has saved settings, use them
        setFormData({
          apiKey: savedConfig.apiKey ? '••••••••' : '',
          model: savedConfig.model || '',
          temperature: savedConfig.temperature?.toString() || '',
          maxTokens: savedConfig.maxTokens?.toString() || '',
        });
      } else if (envConfig) {
        // No saved settings, use .env config
        setFormData({
          apiKey: envConfig.hasApiKey ? '••••••••' : '',
          model: envConfig.model || '',
          temperature: envConfig.defaultTemperature?.toString() || '',
          maxTokens: envConfig.defaultMaxTokens?.toString() || '',
        });
      } else {
        // No config at all, use empty values
        setFormData({
          apiKey: '',
          model: '',
          temperature: '',
          maxTokens: '',
        });
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!provider) return;

    setSaving(true);
    try {
      // Get the actual API key from localStorage if it's masked
      let actualApiKey = formData.apiKey;
      if (formData.apiKey === '••••••••' && typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem('ai-chat-provider-configs');
          if (saved) {
            const allConfigs = JSON.parse(saved);
            actualApiKey = allConfigs[provider]?.apiKey || '';
          }
        } catch (error) {
          console.error('Error reading API key from localStorage:', error);
        }
      }
      
      // If user entered a new API key (not masked), use it
      if (formData.apiKey && formData.apiKey !== '••••••••' && formData.apiKey.trim() !== '') {
        actualApiKey = formData.apiKey.trim();
      }
      
      // For Ollama: if API key is provided, use cloud URL; otherwise use local URL
      let baseURL: string | undefined = undefined;
      if (provider === 'ollama') {
        if (actualApiKey && actualApiKey !== '••••••••' && actualApiKey.trim() !== '') {
          // Cloud mode - use cloud URL
          baseURL = 'https://ollama.com/api';
        } else {
          // Local mode - use local URL
          baseURL = 'http://localhost:11434';
        }
      }
      
      // Update config with actual values (don't send to server, just update local state)
      const updatedConfig = {
        apiKey: actualApiKey && actualApiKey !== '••••••••' && actualApiKey.trim() !== '' ? actualApiKey : undefined,
        model: formData.model && formData.model.trim() !== '' ? formData.model : undefined,
        temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
        maxTokens: formData.maxTokens ? parseInt(formData.maxTokens, 10) : undefined,
        baseURL: baseURL,
      };

      // Validate that API key is provided (except for Ollama local)
      if (!updatedConfig.apiKey && provider !== 'ollama') {
        alert('Please provide an API key');
        setSaving(false);
        return;
      }
      
      // Save to localStorage immediately to persist across page refreshes
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem('ai-chat-provider-configs');
          const allConfigs = saved ? JSON.parse(saved) : {};
          allConfigs[provider] = {
            ...allConfigs[provider],
            ...updatedConfig,
          };
          localStorage.setItem('ai-chat-provider-configs', JSON.stringify(allConfigs));
        } catch (error) {
          console.error('Error saving to localStorage:', error);
        }
      }
      
      alert('Configuration saved! Your settings will persist across page refreshes.');
      if (onConfigUpdate) {
        onConfigUpdate(updatedConfig);
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Load config when provider changes (for standalone mode)
  useEffect(() => {
    if (isStandalone && provider) {
      loadConfig();
    }
  }, [provider, isStandalone]);

  if (!provider) {
    return null;
  }

  // If standalone, only render content (modal wrapper is in parent)
  if (isStandalone) {

    return (
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)]">
          <p className="font-medium mb-1 text-[var(--text-primary)]">Note:</p>
          <p className="text-[var(--text-secondary)]">Your settings will be saved to your browser&apos;s local storage and persist across page refreshes. To set default values for all users, update your <code className="px-1 py-0.5 bg-[var(--bg-primary)] rounded text-[var(--text-primary)]">.env</code> file.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            API Key
          </label>
          <input
            type="password"
            value={formData.apiKey}
            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
            placeholder={config?.hasApiKey ? 'API key is configured' : 'Enter API key'}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {config?.hasApiKey ? 'API key is set in .env' : 'Enter API key to override .env'}
          </p>
        </div>


        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Default Model (Optional)
          </label>
          <input
            type="text"
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            placeholder="gpt-4"
            className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Temperature
            </label>
            <input
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={formData.temperature}
              onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
              placeholder="0.7"
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Max Tokens
            </label>
            <input
              type="number"
              min="1"
              max="4000"
              value={formData.maxTokens}
              onChange={(e) => setFormData({ ...formData, maxTokens: e.target.value })}
              placeholder="1000"
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg bg-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => {
              if (onConfigUpdate) {
                onConfigUpdate({});
              }
            }}
            className="px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Normal mode: render button and modal
  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer relative z-10"
        title="Configure Provider"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[200] bg-black/70"
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 pointer-events-none">
            <div 
              className="w-full max-w-md bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-2xl p-6 max-h-[90vh] overflow-y-auto relative z-[300] pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  Configure {provider}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--text-secondary)] border-t-transparent"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)]">
                    <p className="font-medium mb-1 text-[var(--text-primary)]">Note:</p>
                    <p className="text-[var(--text-secondary)]">Your settings will be saved to your browser&apos;s local storage and persist across page refreshes. To set default values for all users, update your <code className="px-1 py-0.5 bg-[var(--bg-primary)] rounded text-[var(--text-primary)]">.env</code> file.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      placeholder={config?.hasApiKey ? 'API key is configured' : 'Enter API key'}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      {config?.hasApiKey ? 'API key is set in .env' : 'Enter API key to override .env'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Default Model (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder="gpt-4"
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                        Temperature
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={formData.temperature}
                        onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                        placeholder="0.7"
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                        Max Tokens
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="4000"
                        value={formData.maxTokens}
                        onChange={(e) => setFormData({ ...formData, maxTokens: e.target.value })}
                        placeholder="1000"
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 px-4 py-2 rounded-lg bg-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
