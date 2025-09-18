import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@stores/appStore';
import { Button } from '@components/ui/Button';
import { PosterService } from '@modules/poster/service';
import type { AuthContext } from '@modules/auth/context';
import type { OAuthSession, ComicImage, ScheduledGroup, ScheduledImage, SchedulerEntry, PostPlan } from '@modules/types';
import type { DPoPKeyPair } from '@modules/auth/dpop';
import type { AppPasswordSession } from '@modules/auth/appPassword';
import { putSchedulerEntry, listSchedulerEntries, deleteSchedulerEntry } from '@modules/scheduler/storage';

export function PostStep() {
  const {
    postPlan,
    session,
    dpopKeyPair,
    appPasswordSession,
    compressionMode,
    uploadProgress,
    postProgress,
    schedulerEnabled,
    scheduledAt,
    schedulerEntries,
    actions
  } = useAppStore();
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'error' | 'success' | null>(null);
  const [reservationQueued, setReservationQueued] = useState(() => schedulerEntries.length > 0);

  const authContext = buildAuthContext(session, dpopKeyPair, appPasswordSession);

  const startPosting = async () => {
    if (!postPlan) {
      setMessage('有効な投稿内容が見つかりません。前のステップで確認してください。');
      setMessageTone('error');
      return;
    }

    if (schedulerEnabled) {
      if (!scheduledAt) {
        setMessage('予約時刻を入力してください。');
        setMessageTone('error');
        return;
      }
      const scheduledTime = new Date(scheduledAt).getTime();
      if (Number.isNaN(scheduledTime)) {
        setMessage('予約時刻の形式が正しくありません。');
        setMessageTone('error');
        return;
      }
      if (scheduledTime <= Date.now()) {
        setMessage('予約時刻は現在時刻より後を指定してください。');
        setMessageTone('error');
        return;
      }

      setPosting(true);
      setMessage(null);
      setMessageTone(null);
      try {
        const scheduledEntry = buildSchedulerEntry(postPlan, firstPostTitle(postPlan, schedulerEntries), scheduledTime);
        await putSchedulerEntry(scheduledEntry);
        const entries = await listSchedulerEntries();
        actions.setSchedulerEntries(entries);
        actions.setSchedulerEnabled(false);
        actions.setScheduledAt(null);
        actions.resetProgress();
        setMessage(`予約を登録しました（${new Date(scheduledTime).toLocaleString()}）`);
        setMessageTone('success');
        setReservationQueued(true);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
        setMessageTone('error');
        setReservationQueued(false);
      } finally {
        setPosting(false);
      }
      return;
    }

    if (!authContext) {
      setMessage('ログイン情報が無効です。もう一度接続し直してください。');
      setMessageTone('error');
      return;
    }
    setPosting(true);
    setMessage(null);
    setMessageTone(null);
    actions.resetProgress();
    const service = new PosterService(authContext);

    try {
      const result = await service.postPlan(postPlan, {
        compressionMode,
        onUploadProgress: (payload) => actions.updateUploadProgress(payload.imageId, payload),
        onPostProgress: (payload) => actions.updatePostProgress(payload.postId, payload)
      });
      actions.setThreadResult(result);
      actions.setStep('complete');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      setMessageTone('error');
    } finally {
      setPosting(false);
    }
  };

  const handleCancelReservation = async (entry: SchedulerEntry) => {
    try {
      await deleteSchedulerEntry(entry.id);
      const entries = await listSchedulerEntries();
      actions.setSchedulerEntries(entries);
      setMessage('予約を削除しました。');
      setMessageTone('success');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      setMessageTone('error');
    }
  };

  const uploadEntries = Object.entries(uploadProgress);
  const postEntries = Object.entries(postProgress);
  const queue = useMemo(() => schedulerEntries.slice().sort((a, b) => a.scheduledAt - b.scheduledAt), [schedulerEntries]);

  useEffect(() => {
    setReservationQueued(queue.length > 0);
  }, [queue.length]);

  const scheduleMode = schedulerEnabled && !reservationQueued;
  const actionButtonLabel = posting
    ? scheduleMode
      ? '処理中...'
      : '投稿中...'
    : reservationQueued
      ? '予約済み'
      : scheduleMode
        ? '予約を登録'
        : '投稿を開始';
  const infoText = reservationQueued
    ? '予約済みの投稿は指定時刻に自動送信されます。タブ/PWAを指定時刻まで閉じないでください。投稿後、完了画面に遷移します。'
    : scheduleMode
      ? '予約投稿が有効です。「予約を登録」を押すとキューに追加され、指定時刻に自動投稿されます。'
      : '進捗は自動で更新されます。失敗した項目は再試行してください。';

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-50">投稿を実行</h2>
        <p className="text-sm text-slate-400">{infoText}</p>
      </header>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-200">
        <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">予約キュー</p>
        {queue.length === 0 ? (
          <p className="text-xs text-slate-500">登録済みの予約はありません。</p>
        ) : (
          <ul className="space-y-2 text-xs">
            {queue.map((entry) => {
              const scheduledTime = new Date(entry.scheduledAt);
              const cancellable = entry.scheduledAt > Date.now();
              return (
                <li key={entry.id} className="flex flex-col gap-1 rounded-md bg-slate-950/60 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-slate-200">{entry.title}</p>
                    <p className="text-[11px] text-slate-400">{scheduledTime.toLocaleString()}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="self-start text-xs text-rose-300 hover:text-rose-200 sm:self-center"
                    onClick={() => handleCancelReservation(entry)}
                    disabled={!cancellable || posting}
                  >
                    予約を削除
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

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

      {message && (
        <p className={`text-sm ${messageTone === 'success' ? 'text-emerald-300' : 'text-rose-400'}`}>
          {message}
        </p>
      )}

      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={() => actions.setStep('review')} disabled={posting}>
          最終確認に戻る
        </Button>
        <Button
          onClick={startPosting}
          disabled={posting || !postPlan || (scheduleMode && !scheduledAt) || reservationQueued}
        >
          {actionButtonLabel}
        </Button>
      </div>
    </section>
  );
}

function firstPostTitle(plan: PostPlan, existing: SchedulerEntry[]) {
  const firstLine = plan.entries[0]?.text?.split('\n')[0];
  if (firstLine && firstLine.trim().length > 0) {
    return firstLine.trim();
  }
  const lastEntry = existing.length > 0 ? existing[existing.length - 1] : undefined;
  if (lastEntry?.title) {
    return lastEntry.title;
  }
  return 'Scheduled thread';
}

function buildSchedulerEntry(
  plan: PostPlan,
  title: string,
  scheduledAt: number
): SchedulerEntry {
  const groups: ScheduledGroup[] = plan.entries.map((entry) => ({
      id: entry.id,
      text: entry.text,
      images: entry.images.map(toScheduledImage)
    }));
  return {
    id: crypto.randomUUID(),
    title,
    createdAt: Date.now(),
    scheduledAt,
    groups
  };
}

function toScheduledImage(image: ComicImage): ScheduledImage {
  return {
    id: image.id,
    name: image.name,
    type: image.type,
    size: image.size,
    altText: image.altText,
    fileData: image.file
  };
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
