import { useState, useEffect } from 'react';
import { Button } from '@components/ui/Button';
import { useAppStore } from '@stores/appStore';
import type { OAuthConfig } from '@modules/auth/oauth';
import { prepareAuthorization } from '@modules/auth/oauth';
import { storePendingAuthorization } from '@modules/auth/pending';
import { loginWithAppPassword, type AppPasswordSession } from '@modules/auth/appPassword';

const CONFIG_KEY = 'bsky_auth_config';
const PERSIST_KEY = 'bsky_persist_tokens';
const APP_PASSWORD_FLAG = 'bsky_enable_app_password';

interface StoredConfig extends OAuthConfig {}

const defaultRedirect = typeof window !== 'undefined' ? `${window.location.origin}/` : '';

export function AuthStep() {
  const [config, setConfig] = useState<StoredConfig>({
    clientId: '',
    redirectUri: defaultRedirect,
    scope: 'atproto transition:generic atproto transition:create',
    pdsUrl: 'https://bsky.social'
  });
  const [persist, setPersist] = useState<boolean>(false);
  const [enableAppPassword, setEnableAppPassword] = useState<boolean>(false);
  const [appIdentifier, setAppIdentifier] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as StoredConfig;
        setConfig((prev) => ({ ...prev, ...parsed }));
      } catch (error) {
        console.warn('Failed to parse stored config', error);
      }
    }
    setPersist(localStorage.getItem(PERSIST_KEY) === 'true');
    setEnableAppPassword(localStorage.getItem(APP_PASSWORD_FLAG) === 'true');
  }, []);

  const canStart = config.clientId && config.redirectUri && config.scope && config.pdsUrl;

  const startAuthorization = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const preparation = await prepareAuthorization(config);
      await storePendingAuthorization(preparation, config);
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
      localStorage.setItem(PERSIST_KEY, String(persist));
      localStorage.setItem(APP_PASSWORD_FLAG, String(enableAppPassword));
      window.location.href = preparation.authorizeUrl;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      setBusy(false);
    }
  };

  const handleAppPasswordLogin = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const session = await loginWithAppPassword({
        identifier: appIdentifier,
        password: appPassword,
        service: config.pdsUrl
      });
      handleAppPasswordSuccess(session);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      setBusy(false);
    }
  };

  const handleAppPasswordSuccess = (session: AppPasswordSession) => {
    const { actions } = useAppStore.getState();
    actions.setAppPasswordSession(session);
    actions.setStep('ingest');
    setBusy(false);
    setAppPassword('');
  };

  return (
    <section className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-50">Blueskyと接続</h1>
        <p className="text-sm text-slate-400">
          OAuth（PKCE + DPoP）で安全にログインします。登録済みのクライアントIDとリダイレクトURLを入力してください。
        </p>
      </header>

      <form className="grid gap-6 rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-100">
        <label className="grid gap-1">
          <span className="text-xs uppercase tracking-wide text-slate-400">PDS URL</span>
          <input
            type="url"
            value={config.pdsUrl}
            onChange={(event) => setConfig((prev) => ({ ...prev, pdsUrl: event.target.value }))}
            placeholder="https://bsky.social"
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs uppercase tracking-wide text-slate-400">Client ID</span>
          <input
            type="text"
            value={config.clientId}
            onChange={(event) => setConfig((prev) => ({ ...prev, clientId: event.target.value }))}
            placeholder="did:web:example.app"
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs uppercase tracking-wide text-slate-400">Redirect URI</span>
          <input
            type="url"
            value={config.redirectUri}
            onChange={(event) => setConfig((prev) => ({ ...prev, redirectUri: event.target.value }))}
            placeholder={defaultRedirect}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs uppercase tracking-wide text-slate-400">Scope</span>
          <input
            type="text"
            value={config.scope}
            onChange={(event) => setConfig((prev) => ({ ...prev, scope: event.target.value }))}
            placeholder="atproto transition:create"
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none"
          />
        </label>

        <div className="flex items-center justify-between rounded-md bg-slate-950/60 px-4 py-3">
          <label className="flex items-center gap-3 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={persist}
              onChange={(event) => setPersist(event.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-sky-500"
            />
            <span>トークンをIndexedDBに暗号化保存（タブを閉じると復元可）</span>
          </label>
          <Button type="button" onClick={startAuthorization} disabled={!canStart || busy}>
            OAuthを開始
          </Button>
        </div>
      </form>

      <details
        className="rounded-lg border border-slate-800 bg-slate-900/40 p-4"
        open={enableAppPassword}
        onToggle={(event) => {
          const open = event.currentTarget.open;
          setEnableAppPassword(open);
          localStorage.setItem(APP_PASSWORD_FLAG, String(open));
        }}
      >
        <summary className="cursor-pointer text-sm font-medium text-slate-200">
          App Password（代替手段）
        </summary>
        <div className="mt-4 space-y-4 text-sm text-slate-200">
          <p className="text-xs text-slate-400">
            OAuthが利用できない場合のみ使用してください。入力した資格情報はブラウザ内でのみ保持されます。
          </p>
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">Handle / DID</span>
            <input
              type="text"
              value={appIdentifier}
              onChange={(event) => setAppIdentifier(event.target.value)}
              placeholder="example.bsky.social"
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 focus:border-sky-400 focus:outline-none"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">App Password</span>
            <input
              type="password"
              value={appPassword}
              onChange={(event) => setAppPassword(event.target.value)}
              placeholder="xxxx-xxxx-xxxx-xxxx"
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 focus:border-sky-400 focus:outline-none"
            />
          </label>
          <Button type="button" variant="secondary" onClick={handleAppPasswordLogin} disabled={busy || !appIdentifier || !appPassword}>
            App Passwordでログイン
          </Button>
        </div>
      </details>

      {message && <p className="text-sm text-rose-400">{message}</p>}
      {persist && (
        <p className="text-xs text-slate-500">
          IndexedDBの暗号化キーはセッションストレージに保存されます。ブラウザを完全終了すると復元できなくなります。
        </p>
      )}
    </section>
  );
}
