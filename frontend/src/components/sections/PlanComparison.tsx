import { AnimatedSection } from '@/components/AnimatedSection';
import { Divider } from '@/components/tremor/Divider';
import { BarList } from '@/components/tremor/BarList';
import { ProgressCircle } from '@/components/tremor/ProgressCircle';
import { getProgressVariant, formatPercent } from '@/lib/formattingUtils';

import { chart3Data } from '@/data/chartData';

// 1. Ορισμός του Interface για το prop
export interface PlanMetrics {
  coverage: number;
  unused_inventory: number;
}

export interface ComparisonData {
  naive: PlanMetrics;
  equal: PlanMetrics;
  proportional: PlanMetrics;
  optimized: PlanMetrics;
}

interface PlanComparisonProps {
  comparisonData?: ComparisonData;
}

export function PlanComparison({ comparisonData }: PlanComparisonProps) {
  // console.log(comparisonData);
  const optCoverage = (comparisonData?.optimized?.coverage ?? 0.999) * 100;
  const propCoverage = (comparisonData?.proportional?.coverage ?? 0.967) * 100;
  const eqCoverage = (comparisonData?.equal?.coverage ?? 0.812) * 100;
  const naiveCoverage = (comparisonData?.naive?.coverage ?? 0.687) * 100;

  const dynamicChart3Data = comparisonData ? [
    { name: 'Naïve plan', value: comparisonData.naive.unused_inventory * 100 },
    { name: 'Equal allocation', value: comparisonData.equal.unused_inventory * 100 },
    { name: 'Proportional', value: comparisonData.proportional.unused_inventory * 100 },
    { name: 'Optimized', value: comparisonData.optimized.unused_inventory * 100 },
  ].sort((a, b) => b.value - a.value) : chart3Data;

  return (
    <AnimatedSection>
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
        
        <div className="grid grid-cols-2 gap-4 py-4 w-full">
          {/* Optimized Plan Accent Card */}
          <div className="relative flex flex-col items-center justify-center gap-y-3 p-4 rounded-xl border-2 border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] dark:shadow-[0_0_25px_rgba(16,185,129,0.2)] text-center overflow-hidden transition-transform hover:scale-[1.02]">
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-emerald-500/20 blur-2xl rounded-full"></div>
            <ProgressCircle value={optCoverage} variant={getProgressVariant(optCoverage)} radius={40} strokeWidth={6}>
              <span className="text-sm font-bold text-emerald-900 dark:text-emerald-50 font-mono tabular-nums">
                {optCoverage.toFixed(1)}%
              </span>
            </ProgressCircle>
            <div>
              <p className="text-sm font-bold text-emerald-900 dark:text-emerald-50">Optimized Plan</p>
            </div>
          </div>

          {[
            { title: "Naïve plan", value: naiveCoverage },
            { title: "Proportional", value: propCoverage },
            { title: "Equal allocation", value: eqCoverage },
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center justify-center gap-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 shadow-sm text-center opacity-80 hover:opacity-100 transition-all duration-300">
              <ProgressCircle value={item.value} variant={getProgressVariant(item.value)} radius={40} strokeWidth={6}>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-50 font-mono tabular-nums">
                  {item.value.toFixed(1)}%
                </span>
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
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Ranking of strategies based on the percentage of unused inventory at the end of year 3.</p>
          <BarList 
            data={dynamicChart3Data} 
            valueFormatter={formatPercent} 
            className="mt-4"
          />
        </div>
      </div>
    </AnimatedSection>
  );
}

export default PlanComparison;