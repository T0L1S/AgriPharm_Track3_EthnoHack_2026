import { Card } from '@/components/tremor/Card';
import { Divider } from '@/components/tremor/Divider';
import { BarChart } from '@/components/tremor/BarChart';
import { ProgressCircle } from '@/components/tremor/ProgressCircle';

import { 
  coverageData
} from '@/data/chartData';

import { formatPercent } from '@/lib/formattingUtils';

export function BackTesting() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
            {/* Left Column */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div>
                <Divider><h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Back-testing</h3></Divider>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mt-2">How well does the system perform when faced with real-world conditions?</p>
              </div>
              
              <div className="space-y-4 text-base leading-relaxed text-gray-600 dark:text-gray-400">
                <p>A cultivation plan may appear optimal based on the available forecasts, but its actual effectiveness can only be assessed by how well it performs under real-world conditions.</p>
                <p>The back-testing analysis evaluates the system's performance over 12 historical years, simulating the decision-making process as it would unfold in practice.</p>
                <p>The system's performance is then compared to an ideal benchmark scenario <span className="italic">(hindsight)</span>, in which the actual demand and crop yield values are known from the beginning of each year.</p>
              </div>

              <div className="flex flex-col gap-4">
                <Card className="p-6 flex flex-col sm:flex-row items-center gap-6 border-t-4 border-t-emerald-500 dark:border-t-emerald-500/70 shadow-sm">
                  <div className="shrink-0">
                    <ProgressCircle value={88.4} radius={48} strokeWidth={8} variant="success">
                      <span className="text-xl font-bold text-gray-900 dark:text-gray-50 font-mono tabular-nums">88.4%</span>
                    </ProgressCircle>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-base font-semibold text-gray-900 dark:text-gray-50">Mean Demand Coverage</p>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">The Stochastic plan's reliable average protection level across all simulated historical weather and yield scenarios.</p>
                  </div>
                </Card>

                <Card className="p-6 flex flex-col sm:flex-row items-center gap-6 border-t-4 border-t-amber-500 dark:border-t-amber-500/70 shadow-sm">
                  <div className="shrink-0">
                    <ProgressCircle value={64.0} radius={48} strokeWidth={8} variant="warning">
                      <span className="text-xl font-bold text-gray-900 dark:text-gray-50 font-mono tabular-nums">64.0%</span>
                    </ProgressCircle>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-base font-semibold text-gray-900 dark:text-gray-50">Worst-Case Minimum</p>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">A robust safety net that guarantees baseline supply, protecting the population even during catastrophic agricultural failure.</p>
                  </div>
                </Card>
              </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-7 bg-white/40 dark:bg-gray-900/30 backdrop-blur-md border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col justify-center border-slate-800/80 bg-slate-900/40 backdrop-blur-sm shadow-xl ring-1 ring-white/5">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">
                Contrasting average performance against worst-case scenarios. The Stochastic plan remains the most resilient real-world option, maintaining 64.0% minimum coverage, avoiding the catastrophic 41.0% crash seen in the Naïve approach.
              </p>
              <BarChart
                data={coverageData}
                index="plan"
                categories={['Mean Coverage', 'Minimum Coverage']}
                colors={['blue', 'amber']}
                valueFormatter={formatPercent}
                yAxisWidth={75}
                interval={0}
                angle={-25}
                className="h-90"
              />
            </div>
          </section>
  )
}

export default BackTesting;