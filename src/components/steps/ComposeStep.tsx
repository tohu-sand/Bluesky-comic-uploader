import { useMemo } from 'react';
import { useAppStore } from '@stores/appStore';
import { Button } from '@components/ui/Button';

export function ComposeStep() {
  const {
    postPlan,
    firstPostText,
    template,
    templateEnabled,
    altTemplate,
    altTemplateEnabled,
    compressionMode,
    actions
  } = useAppStore();

  const stats = useMemo(() => {
    if (!postPlan) return null;
    return {
      posts: postPlan.totalPosts,
      images: postPlan.totalImages
    };
  }, [postPlan]);

  const facetPresence = useMemo(() => {
    if (!postPlan) {
      return { hasHashtag: false, hasUrl: false };
    }
    let hasHashtag = false;
    let hasUrl = false;
    for (const entry of postPlan.entries) {
      for (const facet of entry.facets ?? []) {
        for (const feature of facet.features) {
          if (feature.$type === 'app.bsky.richtext.facet#tag') {
            hasHashtag = true;
          } else if (feature.$type === 'app.bsky.richtext.facet#link') {
            hasUrl = true;
          }
          if (hasHashtag && hasUrl) {
            return { hasHashtag, hasUrl };
          }
        }
      }
    }
    return { hasHashtag, hasUrl };
  }, [postPlan]);

  const detectedFacetMessage = useMemo(() => {
    if (!facetPresence.hasHashtag && !facetPresence.hasUrl) {
      return null;
    }
    const labels = [
      facetPresence.hasHashtag ? 'ハッシュタグ' : null,
      facetPresence.hasUrl ? 'URL' : null
    ].filter(Boolean).join('と');
    return `${labels}を検出しました。投稿時に自動的にリンク化されます。`;
  }, [facetPresence.hasHashtag, facetPresence.hasUrl]);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-50">本文とテンプレート</h2>
        <p className="text-sm text-slate-400">
          先頭ポストの本文や連番テンプレート、ALTテキストを設定します。
        </p>
      </header>

      <div className="grid gap-6 rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-200">
        <label className="grid gap-1">
          <span className="text-xs uppercase tracking-wide text-slate-400">先頭ポストの本文</span>
          <textarea
            rows={4}
            value={firstPostText}
            onChange={(event) => actions.setFirstPostText(event.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none"
            placeholder="タイトルや概要、タグなどを入力"
          />
        </label>

        {detectedFacetMessage && (
          <p className="rounded-md border border-slate-700 bg-slate-950/40 px-3 py-2 text-xs text-slate-300">
            {detectedFacetMessage}
          </p>
        )}

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
          <textarea
            rows={3}
            value={template}
            onChange={(event) => actions.setTemplate(event.target.value, true)}
            disabled={!templateEnabled}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="例: ({i}/{n})\n#hashtag"
          />
        </div>

        <div className="grid gap-4 rounded-md bg-slate-950/40 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">ALTテキスト</p>
              <p className="text-xs text-slate-500">{`プレースホルダー: {i}, {n}, {name}`}</p>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={altTemplateEnabled}
                onChange={(event) => actions.setAltTemplate(altTemplate, event.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-sky-500"
              />
              <span>有効にする</span>
            </label>
          </div>
          <textarea
            rows={3}
            value={altTemplate}
            onChange={(event) => actions.setAltTemplate(event.target.value)}
            disabled={!altTemplateEnabled}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="例: Page {i} of {n}\nCreator: {name}"
          />
        </div>

        <div className="grid gap-3 rounded-md bg-slate-950/40 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">画像品質</p>
          </div>
          <fieldset className="grid gap-3 text-xs text-slate-300">
            <label className="flex flex-col gap-1 rounded-md border border-transparent bg-slate-950/30 px-3 py-2">
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="compression-mode"
                  value="balanced"
                  checked={compressionMode === 'balanced'}
                  onChange={() => actions.setCompressionMode('balanced')}
                  className="h-4 w-4 border-slate-600 bg-slate-950 text-sky-500"
                />
                <span className="text-sm text-slate-100">標準</span>
              </span>
              <span className="text-[11px] text-slate-500">
                品質と解像度を調整して容量を抑えます。比較的短時間で投稿されます。
              </span>
            </label>
            <label className="flex flex-col gap-1 rounded-md border border-transparent bg-slate-950/30 px-3 py-2">
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="compression-mode"
                  value="near-lossless"
                  checked={compressionMode === 'near-lossless'}
                  onChange={() => actions.setCompressionMode('near-lossless')}
                  className="h-4 w-4 border-slate-600 bg-slate-950 text-sky-500"
                />
                <span className="text-sm text-slate-100">なるべく高画質</span>
              </span>
              <span className="text-[11px] text-slate-500">
                最小の圧縮でアップロードを試みます。投稿までに時間がかかる場合があります。
              </span>
            </label>
          </fieldset>
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
