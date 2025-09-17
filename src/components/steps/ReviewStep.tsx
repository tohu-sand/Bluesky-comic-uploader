import { useMemo, useState } from 'react';
import { useAppStore } from '@stores/appStore';
import { Button } from '@components/ui/Button';
import { putSchedulerEntry, listSchedulerEntries } from '@modules/scheduler/storage';
import type { SchedulerEntry, ScheduledGroup, ScheduledImage, ComicImage } from '@modules/types';

export function ReviewStep() {
  const { postPlan, firstPostText, schedulerEntries, actions } = useAppStore();
  const [scheduleAt, setScheduleAt] = useState<string>('');
  const [scheduling, setScheduling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const entries = postPlan?.entries ?? [];

  const planPreview = useMemo(() => (
    entries.map((entry) => ({
      id: entry.id,
      text: entry.text,
      imageNames: entry.images.map((image) => image.name)
    }))
  ), [entries]);

  const scheduleEnabled = Boolean(scheduleAt);

  const handleSchedule = async () => {
    if (!postPlan || !scheduleEnabled) {
      setMessage('予約時刻を指定してください');
      return;
    }
    setScheduling(true);
    setMessage(null);
    try {
      const scheduledGroups: ScheduledGroup[] = await Promise.all(
        postPlan.entries.map(async (entry) => ({
          id: entry.id,
          text: entry.text,
          images: await Promise.all(entry.images.map(async (image) => toScheduledImage(image)))
        }))
      );
      const entry: SchedulerEntry = {
        id: crypto.randomUUID(),
        title: firstPostText || `Scheduled thread ${new Date().toLocaleString()}`,
        createdAt: Date.now(),
        scheduledAt: new Date(scheduleAt).getTime(),
        groups: scheduledGroups
      };
      await putSchedulerEntry(entry);
      const all = await listSchedulerEntries();
      actions.setSchedulerEntries(all);
      setMessage('予約キューに追加しました。タブを開いたままにすると指定時刻に投稿されます。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setScheduling(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-50">最終確認</h2>
        <p className="text-sm text-slate-400">投稿数と本文、画像の割り当てを確認してから投稿へ進みます。</p>
      </header>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-200">
        <p className="mb-4 text-xs uppercase tracking-wide text-slate-400">構成</p>
        <ul className="space-y-4">
          {planPreview.length > 0 ? (
            planPreview.map((entry) => (
              <li key={entry.id} className="rounded-md border border-slate-800 bg-slate-950/60 p-4">
                <p className="mb-2 text-xs font-medium text-slate-400">ポスト {entry.id}</p>
                <p className="whitespace-pre-wrap text-sm text-slate-100">
                  {entry.text ? entry.text : <span className="text-slate-500">（本文なし）</span>}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  画像: {entry.imageNames.join(', ')}
                </p>
              </li>
            ))
          ) : (
            <li className="rounded-md border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
              有効な画像がありません。
            </li>
          )}
        </ul>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-200">
        <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">予約投稿（タブを閉じると無効）</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <input
            type="datetime-local"
            value={scheduleAt}
            onChange={(event) => setScheduleAt(event.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none"
            min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
          />
          <Button type="button" variant="secondary" onClick={handleSchedule} disabled={!scheduleEnabled || scheduling}>
            予約キューに追加
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          予約はブラウザタブが開いている間のみ有効です。PWAとしてインストールすると継続しやすくなります。
        </p>
        {schedulerEntries.length > 0 && (
          <div className="mt-4 space-y-2 text-xs text-slate-400">
            <p className="uppercase tracking-wide text-slate-500">待機中の予約</p>
            <ul className="space-y-1">
              {schedulerEntries.map((entry) => (
                <li key={entry.id} className="rounded-md bg-slate-950/50 px-3 py-2">
                  {new Date(entry.scheduledAt).toLocaleString()} — {entry.title}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {message && <p className="text-sm text-sky-300">{message}</p>}

      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={() => actions.setStep('compose')}>
          投稿設定に戻る
        </Button>
        <Button onClick={() => actions.setStep('post')} disabled={!postPlan || postPlan.totalImages === 0}>
          投稿実行へ
        </Button>
      </div>
    </section>
  );
}

async function toScheduledImage(image: ComicImage): Promise<ScheduledImage> {
  return {
    id: image.id,
    name: image.name,
    type: image.type,
    size: image.size,
    altText: image.altText,
    fileData: image.file
  };
}
