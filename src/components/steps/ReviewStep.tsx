import { useMemo } from 'react';
import { useAppStore } from '@stores/appStore';
import { Button } from '@components/ui/Button';
import clsx from 'clsx';

export function ReviewStep() {
  const {
    postPlan,
    schedulerEnabled,
    scheduledAt,
    actions
  } = useAppStore();

  const entries = postPlan?.entries ?? [];

  const planPreview = useMemo(() => (
    entries.map((entry) => ({
      id: entry.id,
      text: entry.text,
      imageNames: entry.images.map((image) => image.name)
    }))
  ), [entries]);

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
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-slate-400">予約投稿</p>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={schedulerEnabled}
              onChange={(event) => {
                const enabled = event.target.checked;
                actions.setSchedulerEnabled(enabled);
                if (!enabled) {
                  actions.setScheduledAt(null);
                }
              }}
              className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-sky-500"
            />
            <span>予約投稿を有効にする</span>
          </label>
        </div>
        <div className={clsx('mt-4 grid gap-3 transition-opacity', schedulerEnabled ? 'opacity-100' : 'opacity-60')}
          aria-disabled={!schedulerEnabled}
        >
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">投稿予定時刻</span>
            <input
              type="datetime-local"
              value={scheduledAt ?? ''}
              onChange={(event) => actions.setScheduledAt(event.target.value)}
              disabled={!schedulerEnabled}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
            />
          </label>
          <p className="text-xs text-slate-500">
            予約が有効な場合、次のステップで「即時投稿を開始」を押すとキューに登録され、指定時刻に自動投稿されます（タブ/PWAを開き続ける必要があります）。
          </p>
        </div>
      </div>

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
