import { cx } from '@/lib/utils';

interface ResultsPlaceholderProps {
  // true when the server could not be reached, false while results are still on their way
  failed: boolean;
  className?: string;
}

// Shown in place of a chart while the server's results are missing, so the page never
// shows numbers that did not come from the model.
export function ResultsPlaceholder({ failed, className }: ResultsPlaceholderProps) {
  return (
    <div
      role="status"
      className={cx(
        'flex flex-col items-center justify-center gap-3 min-h-[240px] rounded-2xl p-6 text-center',
        'border-2 border-dashed',
        failed
          ? 'border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20'
          : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40',
        className,
      )}
    >
      {failed ? (
        <>
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">Results couldn't be loaded</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            The simulation server didn't respond. Use <strong>Try Again</strong> in the planner above.
          </p>
        </>
      ) : (
        <>
          <span className="size-6 rounded-full border-2 border-slate-300 border-t-emerald-500 dark:border-slate-700 dark:border-t-emerald-400 animate-spin" aria-hidden="true" />
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">Loading results…</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            The server can take up to a minute to wake up on the first visit.
          </p>
        </>
      )}
    </div>
  );
}

export default ResultsPlaceholder;
