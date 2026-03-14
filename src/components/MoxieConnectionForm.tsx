'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { getSettingsErrorKey } from '@/lib/settings-errors';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ConnectionStatusBadge } from '@/components/ui/ConnectionStatusBadge';

const disabledInputClass =
  'disabled:opacity-60 disabled:cursor-not-allowed';

const LIVE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export function MoxieConnectionForm({ hasSubscription = true, onSaved }: { hasSubscription?: boolean; onSaved?: () => void }) {
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [lastTestedAt, setLastTestedAt] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testMessage, setTestMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const t = useTranslations('moxie');
  const tCommon = useTranslations('common');
  const tSub = useTranslations('subscription');
  const tErrors = useTranslations('errors');
  const disabled = !hasSubscription;

  const displaySaveError = saveError
    ? (getSettingsErrorKey(saveError) ? tErrors(getSettingsErrorKey(saveError) as 'unauthorized') : saveError)
    : null;

  const fetchConnection = useCallback(() => {
    return fetch('/api/moxie/connection', { cache: 'no-store' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        setFetched(true);
        if (!r.ok) return;
        setBaseUrl(data.baseUrl ?? '');
        setHasApiKey(!!data.hasApiKey);
        setLastTestedAt(data.lastTestedAt ?? null);
        setOrganizationId(data.organizationId ?? null);
        setWebhookSecret(data.webhookSecret ?? null);
      })
      .catch(() => setFetched(true));
  }, []);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);
    const body = {
      baseUrl,
      apiKey: apiKey || undefined,
    };
    try {
      const res = await fetch('/api/moxie/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(typeof data.error === 'string' ? data.error : tCommon('error'));
        return;
      }
      setSaveSuccess(true);
      await fetchConnection();
      onSaved?.();
    } catch {
      setSaveError(tCommon('error'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTest() {
    setTestMessage(null);
    setTestLoading(true);
    try {
      const res = await fetch('/api/moxie/test', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        const friendlyMessage = data.errorCode
          ? (t as (key: string) => string)(`errors.${data.errorCode}`)
          : (data.error ?? data.details ?? tCommon('error'));
        throw new Error(friendlyMessage);
      }
      setTestMessage({ type: 'success', text: data.messageKey ? t(data.messageKey as 'connectionSuccess') : t('connectionSuccess') });
      await fetchConnection();
    } catch (err) {
      setTestMessage({ type: 'error', text: err instanceof Error ? err.message : tCommon('error') });
    } finally {
      setTestLoading(false);
    }
  }

  const connected = !!baseUrl;
  const isLive = connected && lastTestedAt && (Date.now() - new Date(lastTestedAt).getTime() < LIVE_THRESHOLD_MS);
  const statusBadge = (
    <ConnectionStatusBadge
      connected={!!isLive}
      connectedLabel={t('statusConnected')}
      disconnectedLabel={connected ? t('statusNotTested') : t('statusDisconnected')}
    />
  );

  // Build the full webhook URL including the secret for Moxie configuration
  const webhookUrl = typeof window !== 'undefined' && organizationId && webhookSecret
    ? `${window.location.origin}/api/webhooks/moxie?org=${organizationId}&secret=${webhookSecret}`
    : typeof window !== 'undefined' && organizationId
      ? `${window.location.origin}/api/webhooks/moxie?org=${organizationId}`
      : '[APP_URL]/api/webhooks/moxie?org=ORG_ID&secret=SECRET';

  if (!fetched)
    return (
      <p className="text-text-secondary">{tCommon('loading')}</p>
    );

  const inputClass =
    'w-full rounded-lg border border-border-medium bg-background-card px-3 py-2.5 text-base min-h-[44px] text-text-primary placeholder:text-text-disabled focus-visible:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/10 ' +
    (disabled ? disabledInputClass : '');
  const labelClass = 'block text-sm font-medium text-text-label mb-1';

  function ExternalLinkIcon({ className }: { className?: string }) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    );
  }

  const mainContent = (
    <>
      {disabled && (
        <p className="text-sm text-text-secondary mb-3" role="status">
          {tSub('guardTitle')}
        </p>
      )}
      <div className="flex items-center gap-2 mb-4">
        {statusBadge}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label htmlFor="moxie-baseUrl" className={labelClass}>
            {t('baseUrl')}
          </label>
          <input
            id="moxie-baseUrl"
            type="url"
            name="baseUrl"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={t('baseUrlPlaceholder')}
            className={inputClass}
            required
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor="moxie-apiKey" className={labelClass}>
            {t('apiKey')}
          </label>
          {hasApiKey && (
            <p className="text-sm text-text-secondary mb-1.5" role="status">
              {t('apiKeyAlreadySaved')}
            </p>
          )}
          <input
            id="moxie-apiKey"
            type="password"
            name="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={t('apiKeyPlaceholder')}
            className={inputClass}
            disabled={disabled}
          />
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button type="submit" variant="primary" disabled={disabled || isSaving}>
            {isSaving ? t('saving') : t('save')}
          </Button>
          <Button
            type="button"
            onClick={handleTest}
            disabled={disabled || testLoading || !baseUrl}
            variant="secondary"
          >
            {testLoading ? t('testing') : t('test')}
          </Button>
        </div>
        {displaySaveError && <Alert variant="error">{displaySaveError}</Alert>}
        {saveSuccess && <Alert variant="success">{t('saved')}</Alert>}
        {testMessage && (
          <Alert variant={testMessage.type === 'error' ? 'error' : 'success'}>{testMessage.text}</Alert>
        )}
      </form>
    </>
  );

  const webhookBlock = (
    <div className="mt-8 pt-6 border-t border-border-light">
      <p className="text-sm text-text-secondary mb-1">{t('webhookUrl')}</p>
      <div className="flex items-start gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <code className="block bg-background-hover px-1.5 py-1 rounded text-xs font-mono text-text-primary break-all">
            {webhookUrl}
          </code>
          <p className="text-xs text-text-secondary mt-1.5">{t('webhookHint')}</p>
          {!webhookSecret && connected && (
            <p className="text-xs text-text-secondary mt-1">{t('saved')}</p>
          )}
        </div>
        <button
          type="button"
          onClick={async () => {
            if (webhookUrl && navigator.clipboard?.writeText) {
              await navigator.clipboard.writeText(webhookUrl);
              setWebhookCopied(true);
              setTimeout(() => setWebhookCopied(false), 2000);
            }
          }}
          className="mt-6 inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-md border border-border-medium bg-background-card text-text-secondary hover:bg-background-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          title={webhookCopied ? t('webhookCopied') : t('copyWebhook')}
          aria-label={webhookCopied ? t('webhookCopied') : t('copyWebhook')}
        >
          {webhookCopied ? (
            <svg className="w-4 h-4 text-status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );

  const moxieHomeUrl = 'https://create.withmoxie.com';
  const rightPanel = (
    <div className="w-full min-w-0 flex flex-col items-start pt-6 lg:pt-8 lg:pl-8">
      <img src="/moxie-logo.png" alt="" className="h-[5.5rem] w-auto object-contain" width={220} height={88} />
      <a
        href={moxieHomeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
      >
        {t('openMoxie')}
        <ExternalLinkIcon className="w-4 h-4 shrink-0" />
      </a>
    </div>
  );

  return (
    <div className={disabled ? 'opacity-70 pointer-events-none' : ''}>
      <div className="flex flex-col lg:grid lg:grid-cols-[3fr_2fr] gap-8 lg:gap-10 items-stretch">
        <div className="min-w-0">{mainContent}</div>
        {rightPanel}
      </div>
      {webhookBlock}
    </div>
  );
}
