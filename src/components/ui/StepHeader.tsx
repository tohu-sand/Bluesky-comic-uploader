import type { WizardStep } from '@stores/appStore';
import clsx from 'clsx';

const STEP_ORDER: WizardStep[] = ['auth', 'ingest', 'preview', 'compose', 'review', 'post', 'complete'];
const STEP_LABELS: Record<WizardStep, string> = {
  auth: 'ログイン',
  ingest: '画像取り込み',
  preview: 'プレビュー',
  compose: '投稿設定',
  review: '最終確認',
  post: '投稿',
  complete: '完了'
};

export function StepHeader({ current }: { current: WizardStep }) {
  return (
    <nav aria-label="進捗" className="mb-6">
      <ol className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-400">
        {STEP_ORDER.map((step, index) => {
          const isActive = step === current;
          const isCompleted = STEP_ORDER.indexOf(current) > index;
          return (
            <li key={step} className="flex items-center gap-2">
              <span
                className={clsx(
                  'flex h-6 w-6 items-center justify-center rounded-full border text-[11px]',
                  isActive && 'border-sky-400 bg-sky-500/20 text-sky-200',
                  isCompleted && 'border-sky-400 bg-sky-500/10 text-sky-200',
                  !isActive && !isCompleted && 'border-slate-600 text-slate-400'
                )}
              >
                {index + 1}
              </span>
              <span className={clsx(isActive ? 'text-slate-100' : isCompleted ? 'text-slate-200' : 'text-slate-500')}>
                {STEP_LABELS[step]}
              </span>
              {index < STEP_ORDER.length - 1 && <span className="text-slate-600">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
