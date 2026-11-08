import { AnimatedSection } from '@/components/AnimatedSection';
import { Card } from '@/components/tremor/Card';
import { Divider } from '@/components/tremor/Divider';
import { BarChart } from '@/components/tremor/BarChart';
import { ProgressCircle } from '@/components/tremor/ProgressCircle';
import { formatPercent } from '@/lib/formattingUtils';
import { ResultsPlaceholder } from '@/components/ResultsPlaceholder';

interface BackTestResult {
  strategy: string;
  mean_coverage: number;
  min_coverage: number;
}

interface BackTestingProps {
  data?: BackTestResult[];
  // true when the server could not be reached
  failed?: boolean;
}

export function BackTesting({ data, failed = false }: BackTestingProps) {
  const containerStyle = "lg:col-span-7 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 sm:p-8 flex flex-col justify-center shadow-xl ring-1 ring-slate-200 dark:ring-white/10";
  const cardBaseStyle = "p-6 flex flex-col sm:flex-row items-center gap-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-md ring-1 ring-slate-200 dark:ring-white/10 rounded-xl transition-all";

  const stochasticData = data?.find(d => d.strategy === 'Stochastic') || { mean_coverage: 0, min_coverage: 0 };
  const stochasticMean = stochasticData.mean_coverage * 100;
  const stochasticMin = stochasticData.min_coverage * 100;

  const chartData = data?.map(d => ({
    plan: d.strategy,
    'Mean Coverage': d.mean_coverage * 100,
    'Minimum Coverage': d.min_coverage * 100
  })) || [];

  return (
    <AnimatedSection>
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div>
          <Divider><h3 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Back-testing</h3></Divider>
          <p className="text-lg font-medium text-emerald-600 dark:text-emerald-400 mt-2">How well does the system perform when faced with real-world conditions?</p>
        </div>
        
        <div className="space-y-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">
          <p>A cultivation plan may appear optimal based on the available forecasts, but its actual effectiveness can only be assessed by how well it performs under real-world conditions.</p>
          <p>The back-testing analysis evaluates the system's performance over 11 historical years (2015–2025), simulating the decision-making process as it would unfold in practice.</p>
          <p>The system's performance is then compared to an ideal benchmark scenario <span className="italic">(hindsight)</span>, in which the actual demand and crop yield values are known from the beginning of each year.</p>
        </div>

        {data && (
        <div className="flex flex-col gap-4">
          <Card className={`${cardBaseStyle} border-l-4 border-l-emerald-500`}>
            <div className="shrink-0">
              <ProgressCircle value={stochasticMean} radius={48} strokeWidth={8} variant="success">
                <span className="text-xl font-bold text-slate-900 dark:text-slate-50 font-mono tabular-nums">
                  {stochasticMean.toFixed(1)}%
                </span>
              </ProgressCircle>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-base font-bold text-slate-900 dark:text-slate-50">Mean Demand Coverage</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">The Stochastic plan's reliable average protection level.</p>
            </div>
          </Card>

          <Card className={`${cardBaseStyle} border-l-4 border-l-amber-500`}>
            <div className="shrink-0">
              <ProgressCircle value={stochasticMin} radius={48} strokeWidth={8} variant="warning">
                <span className="text-xl font-bold text-slate-900 dark:text-slate-50 font-mono tabular-nums">
                  {stochasticMin.toFixed(1)}%
                </span>
              </ProgressCircle>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-base font-bold text-slate-900 dark:text-slate-50">Worst-Case Minimum</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">A robust safety net that guarantees baseline supply.</p>
            </div>
          </Card>
        </div>
        )}
      </div>

      {!data ? (
        <ResultsPlaceholder failed={failed} className="lg:col-span-7" />
      ) : (
      <div className={containerStyle}>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">
          Contrasting average performance against worst-case scenarios.
        </p>
        <BarChart
          data={chartData}
          index="plan"
          categories={['Mean Coverage', 'Minimum Coverage']}
          colors={['blue', 'amber']}
          valueFormatter={formatPercent}
          yAxisWidth={80}
          interval={0}
          angle={-25}
          className="h-90"
        />
      </div>
      )}
    </AnimatedSection>
  );
}

export default BackTesting;