import { useMemo } from 'react';
import { useAppStore } from '@stores/appStore';
import { Button } from '@components/ui/Button';
import { Copy } from 'lucide-react';

export function CompleteStep() {
  const { threadResult, actions } = useAppStore();

  const uriList = useMemo(() => {
    if (!threadResult) return '';
    return [threadResult.rootUri, ...threadResult.uris.filter((uri) => uri !== threadResult.rootUri)].join('\n');
  }, [threadResult]);

  const copyUris = async () => {
    if (!threadResult) return;
    await navigator.clipboard.writeText(uriList);
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-50">投稿が完了しました</h2>
        <p className="text-sm text-slate-400">ルートおよび各返信ポストのURIをコピーできます。</p>
      </header>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-200">
        <p className="text-xs uppercase tracking-wide text-slate-400">投稿URI一覧</p>
        <textarea
          readOnly
          value={uriList}
          rows={Math.min(12, (threadResult?.uris.length ?? 1) + 1)}
          className="mt-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100"
        />
        <div className="mt-3 flex gap-3">
          <Button variant="secondary" onClick={copyUris} disabled={!threadResult} icon={<Copy className="h-4 w-4" />}>
            URIをコピー
          </Button>
          {threadResult && (
            <a
              href={threadResult.rootUri}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-sky-500 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-500/10"
            >
              スレッドを開く
            </a>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={() => actions.setStep('post')}>
          投稿状況に戻る
        </Button>
        <Button onClick={() => actions.resetApp()}>新しい投稿を作成</Button>
      </div>
    </section>
  );
}
