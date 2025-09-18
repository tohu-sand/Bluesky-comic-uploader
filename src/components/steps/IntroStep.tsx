import { Button } from '@components/ui/Button';
import { useAppStore } from '@stores/appStore';

export function IntroStep() {
  const { actions } = useAppStore();

  return (
    <section className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-3 text-center">
        <h1 className="text-3xl font-semibold text-slate-50">Bluesky Comic Uploader へようこそ！</h1>
        <p className="text-sm leading-relaxed text-slate-400">
          このアプリケーションはクリップスタジオで出力した漫画ページをBlueskyにスレッド投稿するためのツールです。
        </p>
      </header>

      <div className="grid gap-4 rounded-lg border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-200">
        <p className="text-slate-300">
          以下の流れでアップロードを実行します。
        </p>
        <ul className="list-disc space-y-2 pl-5 text-slate-300">
          <li>CLIP STUDIO PAINT（クリスタ）でPNG一括出力します。（例: manga_001.png, manga_002.png...）</li>
          <li>Blueskyアカウントでサインインします。</li>
          <li>画像を取り込み、不要ページを除外します。</li>
          <li>本文やテンプレート、ALTテキスト、投稿設定を整えます。</li>
          <li>最終確認のうえ投稿を実行します。（注: 予約投稿は投稿時刻までアプリを開いたままにする必要があります）</li>
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
