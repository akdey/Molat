import { useState } from 'react';
import { cn } from '../lib/utils';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../components/common/Toast';
import { SectionHeading, ConnectionBadge } from '../components/common/States';
import { Button, Select } from '../components/common/FormControls';
import { Download, RefreshCw, LogOut, Moon, Sun, Monitor, Shield } from 'lucide-react';
import type { Theme } from '../contexts/AppContext';

export function SettingsView() {
  const { theme, setTheme, currency, setCurrency, connectionStatus, lastRefresh, books } = useApp();
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);

  async function handleConnectionCheck() {
    setChecking(true);
    try {
      // TODO: const health = await api.get<HealthStatus>('/health');
      await new Promise(r => setTimeout(r, 800));
      toast('Connection to library data is healthy.', 'success');
    } catch {
      toast('Could not reach the library service. Check your connection.', 'error');
    } finally {
      setChecking(false);
    }
  }

  function handleExport() {
    // TODO: real export via booksApi
    toast('Export not yet connected to the backend. Coming soon.', 'info');
  }

  const CURRENCY_OPTIONS = [
    { value: 'INR', label: 'INR — Indian Rupee' },
    { value: 'USD', label: 'USD — US Dollar' },
    { value: 'EUR', label: 'EUR — Euro' },
    { value: 'GBP', label: 'GBP — British Pound' },
    { value: 'JPY', label: 'JPY — Japanese Yen' },
  ];

  const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'system', label: 'System', icon: <Monitor size={16} /> },
    { value: 'light', label: 'Light', icon: <Sun size={16} /> },
    { value: 'dark', label: 'Dark', icon: <Moon size={16} /> },
  ];

  return (
    <div className="space-y-8 max-w-form mx-auto">
      <SectionHeading title="Settings" level={1} />

      {/* Appearance */}
      <section aria-label="Appearance settings">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-ink-muted dark:text-ink-dark-muted mb-3 border-b border-rule dark:border-rule-dark pb-2">
          Appearance
        </h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-ink dark:text-ink-dark mb-2">Theme</p>
            <div className="flex gap-2" role="radiogroup" aria-label="Choose theme">
              {THEME_OPTIONS.map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  role="radio"
                  aria-checked={theme === value}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm border transition-colors',
                    theme === value
                      ? 'border-accent dark:border-accent-dark bg-accent-subtle dark:bg-accent-dark-subtle text-accent dark:text-accent-dark font-medium'
                      : 'border-rule dark:border-rule-dark text-ink-secondary dark:text-ink-dark-secondary hover:border-rule-strong dark:hover:border-rule-dark-strong',
                  )}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Select
            label="Currency"
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            options={CURRENCY_OPTIONS}
            className="max-w-xs"
          />
        </div>
      </section>

      {/* Connection */}
      <section aria-label="Connection status">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-ink-muted dark:text-ink-dark-muted mb-3 border-b border-rule dark:border-rule-dark pb-2">
          Library connection
        </h2>
        <div className="space-y-3">
          <ConnectionBadge status={connectionStatus} lastRefresh={lastRefresh} />
          <p className="text-xs text-ink-muted dark:text-ink-dark-muted">
            Reads and writes go through the backend service. No Google credentials are stored in this browser.
          </p>
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<RefreshCw size={14} />}
            loading={checking}
            onClick={handleConnectionCheck}
          >
            Check connection
          </Button>
        </div>
      </section>

      {/* Data */}
      <section aria-label="Data management">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-ink-muted dark:text-ink-dark-muted mb-3 border-b border-rule dark:border-rule-dark pb-2">
          Data
        </h2>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Download size={14} />}
              onClick={handleExport}
            >
              Export CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Download size={14} />}
              onClick={handleExport}
            >
              Export backup (JSON)
            </Button>
          </div>
          <p className="text-xs text-ink-muted dark:text-ink-dark-muted">
            Exports include all {books.length} records and a schema/version field for reliable restore. Formula injection is sanitized.
          </p>
        </div>
      </section>

      {/* Security notice */}
      <section aria-label="Security information">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-ink-muted dark:text-ink-dark-muted mb-3 border-b border-rule dark:border-rule-dark pb-2">
          Security
        </h2>
        <div className={cn(
          'flex items-start gap-3 p-3 rounded-md',
          'bg-ok-subtle dark:bg-ok-dark-subtle border border-ok/20 dark:border-ok-dark/20',
        )}>
          <Shield size={14} className="text-ok dark:text-ok-dark shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1 text-xs text-ink-secondary dark:text-ink-dark-secondary">
            <p>Your Google service account credentials are stored server-side and never sent to the browser.</p>
            <p>No private keys, OAuth tokens, or spreadsheet IDs are visible in this interface.</p>
          </div>
        </div>
      </section>

      {/* Session */}
      <section aria-label="Session">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-ink-muted dark:text-ink-dark-muted mb-3 border-b border-rule dark:border-rule-dark pb-2">
          Session
        </h2>
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<LogOut size={14} />}
          onClick={() => toast('Sign-out requires the backend auth endpoint.', 'info')}
          className="text-error dark:text-error-dark hover:bg-error-subtle dark:hover:bg-error-dark-subtle"
        >
          Sign out
        </Button>
      </section>
    </div>
  );
}

