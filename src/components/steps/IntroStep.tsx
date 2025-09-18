import { Button } from '@components/ui/Button';
import { useAppStore } from '@stores/appStore';

export function IntroStep() {
  const { actions } = useAppStore();

  return (
    <section className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-3 text-center">
        <h1 className="text-3xl font-semibold text-slate-50">Bluesky Comic Uploader へようこそ</h1>
        <p className="text-sm leading-relaxed text-slate-400">
          このツールは複数ページの画像をまとめて取り込み、テンプレートを使ってポスト本文やALTテキストを自動生成し、Blueskyへ連続投稿するためのウィザードです。
        </p>
      </header>

      <div className="grid gap-4 rounded-lg border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-200">
        <p className="text-slate-300">
          Stepを進めながら以下の流れでアップロードを準備します。
        </p>
        <ul className="list-disc space-y-2 pl-5 text-slate-300">
          <li>Blueskyアカウントでサインインします（次のステップ）。</li>
          <li>Comic画像を取り込み、順番や除外を調整します。</li>
          <li>本文やテンプレート、ALTテキスト、投稿設定を整えます。</li>
          <li>最終確認のうえ投稿またはスケジューリングを実行します。</li>
        </ul>
      </div>

      <div className="flex justify-center">
        <Button size="lg" onClick={() => actions.setStep('auth')}>
          はじめる
        </Button>
      </div>
    </section>
  );
}
