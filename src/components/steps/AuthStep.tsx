import { useEffect, useState } from 'react';
import { Button } from '@components/ui/Button';
import { useAppStore } from '@stores/appStore';
import { loginWithAppPassword, type AppPasswordSession } from '@modules/auth/appPassword';

const PDS_KEY = 'bsky_pds_url';
const DEFAULT_PDS_URL = 'https://bsky.social';

export function AuthStep() {
  const [pdsUrl, setPdsUrl] = useState(DEFAULT_PDS_URL);
  const [appIdentifier, setAppIdentifier] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const storedPds = localStorage.getItem(PDS_KEY);
    if (storedPds) {
      setPdsUrl(storedPds);
    }
  }, []);

  const handleAppPasswordLogin = async () => {
    if (!pdsUrl) {
      setMessage('PDS URL を入力してください。');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const session = await loginWithAppPassword({
        identifier: appIdentifier,
        password: appPassword,
        service: pdsUrl
      });
      localStorage.setItem(PDS_KEY, pdsUrl);
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
        <p className="text-sm text-slate-400">PDS・ユーザー名・App Passwordを入力して接続してください。App PasswordはBluesky公式クライアントから発行できます。</p>
      </header>

      <div className="grid gap-6 rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-100">
        <label className="grid gap-1">
          <span className="text-xs uppercase tracking-wide text-slate-400">PDS URL</span>
          <input
            type="url"
            value={pdsUrl}
            onChange={(event) => setPdsUrl(event.target.value)}
            placeholder="https://bsky.social"
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed"
            disabled={busy}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs uppercase tracking-wide text-slate-400">Handle / DID</span>
          <input
            type="text"
            value={appIdentifier}
            onChange={(event) => setAppIdentifier(event.target.value)}
            placeholder="example.bsky.social"
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed"
            disabled={busy}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs uppercase tracking-wide text-slate-400">App Password</span>
          <input
            type="password"
            value={appPassword}
            onChange={(event) => setAppPassword(event.target.value)}
            placeholder="xxxx-xxxx-xxxx-xxxx"
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed"
            disabled={busy}
          />
        </label>
        <Button
          type="button"
          onClick={handleAppPasswordLogin}
          disabled={busy || !appIdentifier || !appPassword || !pdsUrl}
        >
          ログイン
        </Button>
      </div>

      {message && <p className="text-sm text-rose-400">{message}</p>}
    </section>
  );
}
