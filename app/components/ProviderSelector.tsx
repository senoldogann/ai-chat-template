'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import ProviderConfig from './ProviderConfig';

/**
 * Provider Selector Component
 * Allows users to select and manage LLM providers
 */

interface Provider {
  name: string;
  models: string[];
  apiUrl?: string;
  envKey: string;
  note?: string;
}

interface ProviderSelectorProps {
  selectedProvider: string | null;
  selectedModel: string | null;
  onProviderChange: (provider: string, model: string | null) => void;
  providerConfigs?: Record<string, { apiKey?: string; baseURL?: string; model?: string }>;
  onProviderConfigUpdate?: (provider: string, config: any) => void;
  onOpenConfig?: (provider: string) => void;
}

export default function ProviderSelector({
  selectedProvider,
  selectedModel,
  onProviderChange,
  providerConfigs = {},
  onProviderConfigUpdate,
  onOpenConfig,
}: ProviderSelectorProps) {
  const theme = useTheme();
  const [providers, setProviders] = useState<Record<string, Provider>>({});
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [defaultProvider, setDefaultProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!hasLoaded) {
      loadProviders();
      setHasLoaded(true);
    }
  }, [hasLoaded]);

  // Re-render when providerConfigs change
  useEffect(() => {
    // Force re-render to update Active status
  }, [providerConfigs]);

  // Check if provider is configured (ONLY from UI config, not .env)
  // User must configure provider in UI to make it Active
  const isProviderConfigured = (providerKey: string): boolean => {
    // Check if provider has UI config with API key
    const uiConfig = providerConfigs[providerKey];
    if (uiConfig?.apiKey && uiConfig.apiKey.trim() !== '') {
      return true;
    }
    
    // For Ollama, check baseURL instead of API key
    if (providerKey === 'ollama' && uiConfig?.baseURL && uiConfig.baseURL.trim() !== '') {
      return true;
    }
    
    // For QrokCloud, check both API key and baseURL
    if (providerKey === 'qrokcloud' && uiConfig?.apiKey && uiConfig?.baseURL) {
      if (uiConfig.apiKey.trim() !== '' && uiConfig.baseURL.trim() !== '') {
        return true;
      }
    }
    
    // Only UI config counts, not .env
    return false;
  };

  const loadProviders = async () => {
    try {
      const response = await fetch('/api/llm/providers');
      const data = await response.json();
      
      setProviders(data.providers || {});
      setAvailableProviders(data.available || []);
      setDefaultProvider(data.default || null);

      // Don't auto-select provider when modal opens
      // Only set default if it's the initial load and no provider is selected
      // This prevents changing the top bar model when modal is opened
    } catch (error) {
      console.error('Error loading providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (provider: string) => {
    const providerInfo = providers[provider];
    const model = providerInfo?.models?.[0] || '';
    onProviderChange(provider, model);
    setIsOpen(false);
  };

  const handleModelChange = (model: string) => {
    if (selectedProvider) {
      onProviderChange(selectedProvider, model);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--text-secondary)] border-t-transparent"></div>
        <span className="text-sm text-[var(--text-secondary)]">Loading providers...</span>
      </div>
    );
  }

  const currentProvider = selectedProvider ? providers[selectedProvider] : null;
  const currentModels = currentProvider?.models || [];

  return (
    <div className="flex flex-col gap-4">
      {/* Provider Selection */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-[var(--text-primary)] whitespace-nowrap">
          Provider:
        </label>
        <div className="relative flex-1 z-[100]">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer text-sm"
          >
            <span className="flex items-center gap-2">
              {selectedProvider ? (
                <>
                  <span className="font-medium">{providers[selectedProvider]?.name || selectedProvider}</span>
                  {isProviderConfigured(selectedProvider) ? (
                    <span className="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-600 dark:text-green-400">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs rounded bg-gray-500/20 text-gray-600 dark:text-gray-500/80 dark:bg-gray-500/30">
                      <span className="text-gray-600 dark:text-gray-400">Not Configured</span>
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[var(--text-secondary)]">Select Provider</span>
              )}
            </span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {/* Dropdown */}
          {isOpen && (
            <>
              <div
                className="fixed inset-0 z-[60]"
                onClick={() => setIsOpen(false)}
              ></div>
              <div className="absolute z-[150] w-full mt-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg shadow-2xl max-h-64 overflow-y-auto">
                {Object.entries(providers).map(([key, provider]) => {
                  const isAvailable = isProviderConfigured(key);
                  return (
                    <button
                      key={key}
                      onClick={() => handleProviderChange(key)}
                      className={`w-full text-left px-3 py-2 hover:bg-[var(--hover-bg)] transition-colors cursor-pointer ${
                        selectedProvider === key ? 'bg-[var(--hover-bg)]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {provider.name}
                        </span>
                        {isAvailable ? (
                          <span className="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-600 dark:text-green-400">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs rounded bg-gray-500/20 text-gray-600 dark:text-gray-500/80 dark:bg-gray-500/30">
                            <span className="text-gray-600 dark:text-gray-400">Not Configured</span>
                          </span>
                        )}
                      </div>
                      {provider.note && (
                        <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)]/90 mt-1">{provider.note}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Model Selection */}
      {selectedProvider && currentModels.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-[var(--text-primary)] whitespace-nowrap">
            Model:
          </label>
          <select
            value={selectedModel || ''}
            onChange={(e) => handleModelChange(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {currentModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Provider Config */}
      {selectedProvider && currentProvider && (
        <div className="flex items-center justify-end mt-2 pt-2 border-t border-[var(--border-color)]">
          {onOpenConfig && selectedProvider ? (
            <button
              onClick={() => onOpenConfig(selectedProvider)}
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
          ) : (
            <ProviderConfig 
              provider={selectedProvider} 
              onConfigUpdate={(config) => {
                if (onProviderConfigUpdate && selectedProvider) {
                  onProviderConfigUpdate(selectedProvider, config);
                }
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

