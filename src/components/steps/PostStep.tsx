import { useState } from 'react';
import { useAppStore } from '@stores/appStore';
import { Button } from '@components/ui/Button';
import { PosterService } from '@modules/poster/service';
import type { AuthContext } from '@modules/auth/context';
import type { OAuthSession } from '@modules/types';
import type { DPoPKeyPair } from '@modules/auth/dpop';
import type { AppPasswordSession } from '@modules/auth/appPassword';

export function PostStep() {
  const {
    postPlan,
    session,
    dpopKeyPair,
    appPasswordSession,
    uploadProgress,
    postProgress,
    actions
  } = useAppStore();
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const authContext = buildAuthContext(session, dpopKeyPair, appPasswordSession);

  const startPosting = async () => {
    if (!postPlan || !authContext) {
      setMessage('ログイン情報が無効です。もう一度接続し直してください。');
      return;
    }
    setPosting(true);
    setMessage(null);
    actions.resetProgress();
    const service = new PosterService(authContext);

    try {
      const result = await service.postPlan(postPlan, {
        onUploadProgress: (payload) => actions.updateUploadProgress(payload.imageId, payload),
        onPostProgress: (payload) => actions.updatePostProgress(payload.postId, payload)
      });
      actions.setThreadResult(result);
      actions.setStep('complete');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setPosting(false);
    }
  };

  const uploadEntries = Object.entries(uploadProgress);
  const postEntries = Object.entries(postProgress);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-50">投稿を実行</h2>
        <p className="text-sm text-slate-400">
          進捗は自動で更新されます。失敗した項目は再試行してください。
        </p>
      </header>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-200">
        <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">画像アップロード</p>
        <ul className="space-y-2 text-xs">
          {uploadEntries.length === 0 && <li className="text-slate-500">未開始</li>}
          {uploadEntries.map(([imageId, status]) => (
            <li key={imageId} className="flex items-center justify-between rounded-md bg-slate-950/50 px-3 py-2">
              <span className="text-slate-300">#{imageId.slice(0, 6)}</span>
              <span className={status.status === 'error' ? 'text-rose-400' : status.status === 'success' ? 'text-emerald-300' : 'text-sky-300'}>
                {status.status}
                {status.error ? `: ${status.error}` : ` (${status.attempt})`}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-200">
        <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">投稿チェーン</p>
        <ul className="space-y-2 text-xs">
          {postEntries.length === 0 && <li className="text-slate-500">未開始</li>}
          {postEntries.map(([postId, status]) => (
            <li key={postId} className="flex items-center justify-between rounded-md bg-slate-950/50 px-3 py-2">
              <span className="text-slate-300">ポスト {postId}</span>
              <span className={status.status === 'error' ? 'text-rose-400' : status.status === 'success' ? 'text-emerald-300' : 'text-sky-300'}>
                {status.status}
                {status.uri ? ` → ${status.uri}` : status.error ? `: ${status.error}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {message && <p className="text-sm text-rose-400">{message}</p>}

      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={() => actions.setStep('review')} disabled={posting}>
          最終確認に戻る
        </Button>
        <Button onClick={startPosting} disabled={posting || !postPlan}>
          {posting ? '投稿中...' : '投稿を開始'}
        </Button>
      </div>
    </section>
  );
}

function buildAuthContext(
  session: OAuthSession | null,
  dpopKeyPair: DPoPKeyPair | null,
  appPasswordSession: AppPasswordSession | null
): AuthContext | null {
  if (session && dpopKeyPair) {
    return { type: 'oauth', session, dpopKeyPair };
  }
  if (appPasswordSession) {
    return {
      type: 'app-password',
      service: appPasswordSession.service,
      did: appPasswordSession.did,
      accessJwt: appPasswordSession.accessJwt,
      refreshJwt: appPasswordSession.refreshJwt
    };
  }
  return null;
}
