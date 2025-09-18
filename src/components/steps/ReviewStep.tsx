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
      imageNames: entry.images.map((image) => image.name),
      images: entry.images.map((image) => ({
        id: image.id,
        index: image.index,
        name: image.name,
        displayUrl: image.thumbnailUrl ?? image.objectUrl,
        altText: image.altText || image.name
      }))
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
                <div className="mt-3 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-slate-400">画像</p>
                  <ul className="flex flex-wrap gap-2">
                    {entry.images.length > 0 ? (
                      entry.images.map((image) => (
                        <li
                          key={image.id}
                          className="relative h-16 w-16 overflow-hidden rounded-md border border-slate-800 bg-slate-950/80"
                        >
                          {image.displayUrl ? (
                            <img
                              src={image.displayUrl}
                              alt={image.altText}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
                              No preview
                            </div>
                          )}
                          <span className="absolute bottom-1 left-1 rounded bg-slate-900/80 px-1 text-[10px] font-mono text-slate-200">
                            #{image.index + 1}
                          </span>
                        </li>
                      ))
                    ) : (
                      <li className="text-xs text-slate-500">画像がありません</li>
                    )}
                  </ul>
                  {entry.imageNames.length > 0 && (
                    <p className="truncate text-xs text-slate-500" title={entry.imageNames.join(', ')}>
                      {entry.imageNames.join(', ')}
                    </p>
                  )}
                </div>
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
