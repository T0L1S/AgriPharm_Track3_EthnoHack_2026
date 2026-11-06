import { Divider } from '@/components/tremor/Divider';
import { BarChart } from '@/components/tremor/BarChart';
import { BarList } from '@/components/tremor/BarList';
import { ComboChart } from '@/components/tremor/ComboChart';
import { ProgressCircle } from '@/components/tremor/ProgressCircle';
import { getProgressVariant, formatEuro, formatPercent } from '@/lib/formattingUtils';

import { 
  chart1Data, chart2Data, chart3Data
} from '@/data/chartData';

export function PlanComparison() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
            {/* Left Column: Context & Insights */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div>
                <Divider><h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Comparison of Cultivation Plans</h3></Divider>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mt-2">Which cultivation plan best meets the needs?</p>
              </div>
              
              <div className="space-y-4 text-base leading-relaxed text-gray-600 dark:text-gray-400">
                <p>This section compares four different strategies for planning the cultivation of plants needed for the production of herbal medicines. All plans are evaluated based on the same demand, using the same available arable land and the same storage capacity.</p>
                <p>4 approaches are examined:</p>
                <ul className="list-disc list-outside pl-6 space-y-2 marker:text-gray-400">
                  <li><strong className="text-gray-900 dark:text-gray-100">Naïve plan:</strong> A single sowing is carried out at the beginning of the available period, with the aim of meeting the entire annual demand.</li>
                  <li><strong className="text-gray-900 dark:text-gray-100">Equal allocation:</strong> The available area is divided equally among the permitted sowing months, allowing the production to be spread more evenly throughout the year.</li>
                  <li><strong className="text-gray-900 dark:text-gray-100">Previous year's plan:</strong> The cultivation plan optimized for the previous year's demand is applied in order to assess how well it meets the current year's needs.</li>
                  <li><strong className="text-gray-900 dark:text-gray-100">Optimized plan:</strong> The best possible cultivation plan is determined based on the current year's demand and available resources.</li>
                </ul>
              </div>
              
              {/* Unified 2x2 KPI Grid */}
              <div className="grid grid-cols-2 gap-4 py-4 w-full">
                {/* Optimized Plan Accent Card */}
                <div className="flex flex-col items-center justify-center gap-y-3 p-4 rounded-xl border border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/20 shadow-sm text-center">
                  <ProgressCircle value={99.9} variant={getProgressVariant(99.9)} radius={40} strokeWidth={6}>
                    <span className="text-sm font-bold text-emerald-900 dark:text-emerald-50 font-mono tabular-nums">99.9%</span>
                  </ProgressCircle>
                  <div>
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-50">Optimized Plan</p>
                  </div>
                </div>

                {/* Subordinate Muted Cards */}
                {[
                  { title: "Previous year's", value: 96.7 },
                  { title: "Equal allocation", value: 81.2 },
                  { title: "Naïve plan", value: 68.7 }
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center justify-center gap-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shadow-sm text-center">
                    <ProgressCircle value={item.value} variant={getProgressVariant(item.value)} radius={40} strokeWidth={6}>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-50 font-mono tabular-nums">{item.value}%</span>
                    </ProgressCircle>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{item.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Visuals & Exploration */}
            <div className="lg:col-span-7 bg-white/40 dark:bg-gray-900/30 backdrop-blur-md border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col gap-10 border-slate-800/80 bg-slate-900/40 backdrop-blur-sm shadow-xl ring-1 ring-white/5">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Comparison of annual cost (€) broken down into cultivation, storage, and Unmet Demand</p>
                <BarChart
                  data={chart1Data}
                  type="stacked"
                  index="plan"
                  categories={['Cultivation', 'Storage', 'Unmet Demand']}
                  colors={['emerald', 'blue', 'amber']}
                  valueFormatter={formatEuro}
                  yAxisWidth={75}
                  // interval={0}
                  // angle={-25}
                  className="h-80"
                />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Annual cost on a bar chart (left axis) versus demand coverage on a line chart (right axis)</p>
                <ComboChart
                  data={chart2Data}
                  index="plan"
                  enableBiaxial={true}
                  barSeries={{ categories: ['Annual Cost'], colors: ['blue'], valueFormatter: formatEuro, yAxisWidth: 75 }}
                  lineSeries={{ categories: ['Demand Coverage'], colors: ['emerald'], valueFormatter: formatPercent, yAxisWidth: 50 }}
                  // interval={0}
                  className="h-80"
                />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Ranking of strategies based on the percentage of unused inventory.</p>
                <BarList 
                  data={chart3Data} 
                  valueFormatter={formatPercent} 
                  className="mt-4"
                />
              </div>
            </div>
          </section>
  )
}

export default PlanComparison;