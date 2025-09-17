import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@stores/appStore';
import { Button } from '@components/ui/Button';

export function PreviewStep() {
  const { images, actions } = useAppStore();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  useEffect(() => {
    setFocusedIndex(0);
  }, [images.length]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (images.length === 0) return;
      if (['ArrowRight', 'ArrowLeft', ' ', 'Spacebar', 'Delete', 'Backspace'].includes(event.key)) {
        event.preventDefault();
      }
      if (event.key === 'ArrowRight') {
        setFocusedIndex((index) => Math.min(index + 1, images.length - 1));
      } else if (event.key === 'ArrowLeft') {
        setFocusedIndex((index) => Math.max(index - 1, 0));
      } else if (event.key === ' ' || event.key === 'Spacebar') {
        toggleRemoval(images[focusedIndex]?.id);
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        toggleRemoval(images[focusedIndex]?.id, true);
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [images, focusedIndex]);

  const toggleRemoval = (id?: string, remove?: boolean) => {
    if (!id) return;
    actions.markImagesRemoved([id], remove ?? !(images.find((image) => image.id === id)?.markedForRemoval));
  };

  const activeImages = useMemo(() => images.filter((image) => !image.markedForRemoval), [images]);
  const blankCandidates = images.filter((image) => image.blankCandidate && !image.markedForRemoval);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-50">プレビュー & 編集</h2>
        <p className="text-sm text-slate-400">
          Deleteキーで除外、Spaceキーでトグル。白紙候補は自動でマーキングします。
        </p>
      </header>

      {blankCandidates.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          <p className="font-medium">白紙ページの可能性があるページを検出しました</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {blankCandidates.map((image) => (
              <button
                key={image.id}
                type="button"
                className="rounded-md border border-amber-500 px-2 py-1 hover:bg-amber-500/20"
                onClick={() => setFocusedIndex(images.indexOf(image))}
              >
                #{image.index + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-300">
        <span>
          選択中: {activeImages.length}/{images.length} 枚
        </span>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showOnlyActive}
            onChange={(event) => setShowOnlyActive(event.target.checked)}
            className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-sky-500"
          />
          <span>有効なページのみ表示</span>
        </label>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images
          .filter((image) => (showOnlyActive ? !image.markedForRemoval : true))
          .map((image) => {
            const originalIndex = images.indexOf(image);
            const isFocused = originalIndex === focusedIndex;
            const isRemoved = image.markedForRemoval;
            return (
              <li
                key={image.id}
                className={`group relative rounded-xl border ${
                  isRemoved ? 'border-rose-500/60 bg-rose-500/10' : isFocused ? 'border-sky-400' : 'border-slate-800'
                } bg-slate-900/60 p-4 transition`}
              >
                <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                  <span className="font-mono text-slate-200">#{image.index + 1}</span>
                  {image.blankCandidate && <span className="text-amber-300">白紙候補</span>}
                </div>
                <div className="flex justify-center">
                  {image.thumbnailUrl ? (
                    <img
                      src={image.thumbnailUrl}
                      alt={image.altText}
                      className={`max-h-48 rounded-md border ${isRemoved ? 'border-rose-400/70 opacity-50' : 'border-slate-800'}`}
                    />
                  ) : (
                    <div className="flex h-48 w-full items-center justify-center rounded-md border border-slate-800 text-slate-500">
                      No preview
                    </div>
                  )}
                </div>
                <div className="mt-3 text-xs text-slate-300">
                  <button
                    type="button"
                    className={`w-full rounded-md border px-3 py-2 text-xs font-medium ${
                      isRemoved
                        ? 'border-emerald-500 text-emerald-300 hover:bg-emerald-500/10'
                        : 'border-rose-500 text-rose-300 hover:bg-rose-500/10'
                    }`}
                    onClick={() => toggleRemoval(image.id)}
                  >
                    {isRemoved ? '復帰' : '除外'}
                  </button>
                </div>
              </li>
            );
          })}
      </ul>

      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={() => actions.setStep('ingest')}>
          画像取り込みに戻る
        </Button>
        <Button onClick={() => actions.setStep('compose')} disabled={activeImages.length === 0}>
          投稿設定へ
        </Button>
      </div>
    </section>
  );
}
