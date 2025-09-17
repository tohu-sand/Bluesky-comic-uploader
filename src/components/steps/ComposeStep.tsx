import { useMemo } from 'react';
import { useAppStore } from '@stores/appStore';
import { Button } from '@components/ui/Button';
import { updateAltTexts } from '@modules/editor/altText';

export function ComposeStep() {
  const { images, postPlan, firstPostText, template, templateEnabled, fallbackBody, altTemplate, altTemplateEnabled, actions } = useAppStore();

  const regenerateAlt = () => {
    const copy = images.map((image) => ({ ...image }));
    updateAltTexts(copy, altTemplateEnabled ? altTemplate : 'Page {i}');
    actions.setImages(copy);
  };

  const stats = useMemo(() => {
    if (!postPlan) return null;
    return {
      posts: postPlan.totalPosts,
      images: postPlan.totalImages
    };
  }, [postPlan]);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-50">本文とテンプレート</h2>
        <p className="text-sm text-slate-400">
          1ポスト目の本文や連番テンプレート、ALTテキストの初期値を設定します。
        </p>
      </header>

      <div className="grid gap-6 rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-200">
        <label className="grid gap-1">
          <span className="text-xs uppercase tracking-wide text-slate-400">1ポスト目の本文</span>
          <textarea
            rows={4}
            value={firstPostText}
            onChange={(event) => actions.setFirstPostText(event.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none"
            placeholder="タイトルや概要、タグなどを入力"
          />
        </label>

        <div className="grid gap-4 rounded-md bg-slate-950/40 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">連番テンプレート</p>
              <p className="text-xs text-slate-500">{`プレースホルダー: {i}, {n}, {from}, {to}`}</p>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={templateEnabled}
                onChange={(event) => actions.setTemplate(template, event.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-sky-500"
              />
              <span>有効にする</span>
            </label>
          </div>
          <input
            type="text"
            value={template}
            onChange={(event) => actions.setTemplate(event.target.value, true)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 focus:border-sky-400 focus:outline-none"
            placeholder="例: {i}/{n}"
          />
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">テンプレートOFF時の本文</span>
            <input
              type="text"
              value={fallbackBody}
              onChange={(event) => actions.setFallbackBody(event.target.value)}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 focus:border-sky-400 focus:outline-none"
            />
          </label>
        </div>

        <div className="grid gap-4 rounded-md bg-slate-950/40 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">ALTテキストの初期値</p>
              <p className="text-xs text-slate-500">{`プレースホルダー: {i}, {n}, {name}`}</p>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={altTemplateEnabled}
                onChange={(event) => actions.setAltTemplate(altTemplate, event.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-sky-500"
              />
              <span>自動更新を有効化</span>
            </label>
          </div>
          <input
            type="text"
            value={altTemplate}
            onChange={(event) => actions.setAltTemplate(event.target.value, true)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 focus:border-sky-400 focus:outline-none"
          />
          <Button type="button" variant="secondary" onClick={regenerateAlt}>
            ALTテキストを再生成
          </Button>
        </div>

        {stats && (
          <dl className="grid grid-cols-2 gap-4 rounded-md bg-slate-950/30 p-4 text-center text-xs text-slate-300">
            <div className="space-y-1">
              <dt className="uppercase tracking-wide text-slate-500">ポスト数</dt>
              <dd className="text-xl font-semibold text-slate-100">{stats.posts}</dd>
            </div>
            <div className="space-y-1">
              <dt className="uppercase tracking-wide text-slate-500">画像枚数</dt>
              <dd className="text-xl font-semibold text-slate-100">{stats.images}</dd>
            </div>
          </dl>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={() => actions.setStep('preview')}>
          プレビューに戻る
        </Button>
        <Button onClick={() => actions.setStep('review')} disabled={!postPlan || postPlan.totalImages === 0}>
          最終確認へ
        </Button>
      </div>
    </section>
  );
}
